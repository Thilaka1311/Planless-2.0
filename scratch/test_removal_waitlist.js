import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "/Users/thilak/Documents/Planless/Planless Repo /Planless-2.0/.env" });

const url = process.env.SUPABASE_URL || "https://yuuzenyjxxuqahosflob.supabase.co";
const key = process.env.SUPABASE_KEY || "sb_publishable_Ql0r2aGtFaURLnWhegTDhw_GQRdbKGF";

const client = createClient(url, key);

async function test() {
  console.log("=== RUNNING REMOVE PARTICIPANT WAITLIST TEST ===");

  const { data: plans, error: planError } = await client.from("plans").select("*");
  if (planError) {
    console.error("Failed to fetch plans:", planError);
    return;
  }

  for (const p of plans) {
    const { data: participants, error: ppError } = await client.from("plan_participants").select("*").eq("plan_id", p.id);
    if (ppError) continue;

    const waitlist = participants.filter(pp => pp.status === "waitlist");
    if (waitlist.length > 0) {
      console.log(`Plan "${p.title}" (ID: ${p.id}, waitlist_enabled: ${p.waitlist_enabled}, join_limit: ${p.join_limit}) has waitlist participants:`, waitlist.map(w => w.user_id));
      
      const hostId = p.host_id || p.created_by;
      const goingParticipant = participants.find(pp => pp.status === "going" && pp.user_id !== hostId);
      
      if (goingParticipant) {
        console.log(`Going participant to remove: ${goingParticipant.user_id}`);
        
        // Let's test the upsert for waitlist promotion!
        const acceptedCountAfterRemoval = participants.filter(pp => pp.status === "going" && pp.id !== goingParticipant.id).length;
        const limit = p.join_limit || 0;
        const availableCapacity = limit - acceptedCountAfterRemoval;
        console.log(`Capacity: limit=${limit}, acceptedAfterRemoval=${acceptedCountAfterRemoval}, availableCapacity=${availableCapacity}`);

        if (availableCapacity > 0) {
          const updates = [{
            id: waitlist[0].id,
            status: "going",
            payment_status: "unpaid",
            joined_at: new Date().toISOString()
          }];

          console.log("Upserting waitlist promotion to DB:", updates);
          const { data: upsertData, error: upsertError } = await client
            .from("plan_participants")
            .upsert(updates)
            .select("*");

          if (upsertError) {
            console.error("WAITLIST UPSERT FAILED WITH ERROR:", upsertError);
          } else {
            console.log("Waitlist upsert succeeded:", upsertData);
          }
        }
        break;
      }
    }
  }

  console.log("=== TEST COMPLETED ===");
}

test();

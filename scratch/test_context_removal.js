import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "/Users/thilak/Documents/Planless/Planless Repo /Planless-2.0/.env" });

const url = process.env.SUPABASE_URL || "https://yuuzenyjxxuqahosflob.supabase.co";
const key = process.env.SUPABASE_KEY || "sb_publishable_Ql0r2aGtFaURLnWhegTDhw_GQRdbKGF";

const client = createClient(url, key);

async function test() {
  console.log("=== SIMULATING EXACT REMOVE FLOW ===");
  const planId = "ade74eff-b019-4a50-a51b-76ee699b15ec";
  const userUuidToRemove = "b494bcd9-321a-4f43-a91a-45d448a4e146"; // going user

  // Get initial state
  const { data: initPps } = await client.from("plan_participants").select("*").eq("plan_id", planId);
  console.log("Before removal, participants count:", initPps.length);

  // 1. Delete participant (simulating deleteParticipant)
  console.log("Simulating deleteParticipant...");
  const delRes = await fetch("http://localhost:3000/api/db/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      table: "plan_participants",
      match: { plan_id: planId, user_id: userUuidToRemove }
    })
  });
  console.log("Delete status:", delRes.status);
  const delJson = await delRes.json();
  console.log("Delete response data:", delJson);

  // 2. Simulate promoteWaitlist
  console.log("Simulating promoteWaitlistIfSpotsAvailable...");
  const fetchRes = await fetch("http://localhost:3000/api/db/fetch-all?tables=plans,plan_participants");
  const fetchJson = await fetchRes.json();
  const dbPlansList = fetchJson.data?.plans || [];
  const dbParticipantsList = fetchJson.data?.plan_participants || [];

  const dbPlanObj = dbPlansList.find(p => p.id === planId);
  if (!dbPlanObj) {
    console.log("Plan not found in DB");
    return;
  }

  const planParticipants = dbParticipantsList.filter(pp => pp.plan_id === planId);
  const acceptedCount = planParticipants.filter(pp => pp.status === "going").length;
  const limit = dbPlanObj.join_limit || 0;
  const availableCapacity = limit - acceptedCount;
  console.log(`Capacity: limit=${limit}, accepted=${acceptedCount}, available=${availableCapacity}`);

  const waitlisted = planParticipants
    .filter(pp => pp.status === "waitlist")
    .sort((a, b) => new Date(a.waitlisted_at).getTime() - new Date(b.waitlisted_at).getTime());

  console.log("Waitlisted count:", waitlisted.length);

  if (availableCapacity > 0 && waitlisted.length > 0) {
    const pToPromote = waitlisted[0];
    const updates = [{
      id: pToPromote.id,
      status: "going",
      payment_status: "unpaid",
      joined_at: new Date().toISOString()
    }];

    console.log("Upserting waitlist promotion...");
    const upsertRes = await fetch("http://localhost:3000/api/db/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "plan_participants", records: updates })
    });
    console.log("Upsert status:", upsertRes.status);
    const upsertJson = await upsertRes.json();
    console.log("Upsert response:", upsertJson);
  }

  // Restore original state
  console.log("Restoring original state...");
  await client.from("plan_participants").insert({
    plan_id: planId,
    user_id: userUuidToRemove,
    status: "going",
    payment_status: "paid",
    joined_at: new Date().toISOString(),
    participant_id: "PP_1781178945098_invitee_2"
  });
  await client.from("plan_participants").update({ status: "waitlist" }).eq("user_id", "bd1d2147-5509-4254-b09a-de7127d69b41");
  console.log("Restoration done.");
}

test();

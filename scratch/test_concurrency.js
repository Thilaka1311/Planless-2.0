import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "/Users/thilak/Documents/Planless/Planless Repo /Planless-2.0/.env" });

const url = process.env.SUPABASE_URL || "https://yuuzenyjxxuqahosflob.supabase.co";
const key = process.env.SUPABASE_KEY || "sb_publishable_Ql0r2aGtFaURLnWhegTDhw_GQRdbKGF";

const client = createClient(url, key);

async function test() {
  console.log("=== TESTING CONCURRENCY & PROPAGATION ===");
  const planId = "ade74eff-b019-4a50-a51b-76ee699b15ec";
  const userIdToDelete = "b494bcd9-321a-4f43-a91a-45d448a4e146";

  // Reset waitlist
  await client.from("plan_participants").update({ status: "waitlist" }).eq("plan_id", planId).eq("user_id", "bd1d2147-5509-4254-b09a-de7127d69b41");

  console.log("1. Sending delete request...");
  const delRes = await fetch("http://localhost:3000/api/db/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      table: "plan_participants",
      match: { plan_id: planId, user_id: userIdToDelete }
    })
  });
  const delJson = await delRes.json();
  console.log("Delete response count:", delJson.count);

  console.log("2. Immediately sending fetch-all request for waitlist check...");
  const fetchRes = await fetch("http://localhost:3000/api/db/fetch-all?tables=plans,plan_participants");
  const fetchJson = await fetchRes.json();
  const participants = fetchJson.data?.plan_participants.filter(pp => pp.plan_id === planId) || [];
  console.log("Fetch-all participants list:", participants.map(pp => `${pp.user_id} (${pp.status})`));

  const deletedStillPresent = participants.some(pp => pp.user_id === userIdToDelete);
  console.log("Is deleted participant still present in fetch-all?", deletedStillPresent);

  // If we try to promote:
  const acceptedCount = participants.filter(pp => pp.status === "going").length;
  console.log("Accepted count including deleted user (if present):", acceptedCount);

  // Restore state for cleanup
  await client.from("plan_participants").insert({
    plan_id: planId,
    user_id: userIdToDelete,
    status: "going",
    payment_status: "paid",
    joined_at: new Date().toISOString(),
    participant_id: "PP_1781178945098_invitee_2"
  });
}

test();

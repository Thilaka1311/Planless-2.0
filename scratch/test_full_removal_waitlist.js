import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "/Users/thilak/Documents/Planless/Planless Repo /Planless-2.0/.env" });

const url = process.env.SUPABASE_URL || "https://yuuzenyjxxuqahosflob.supabase.co";
const key = process.env.SUPABASE_KEY || "sb_publishable_Ql0r2aGtFaURLnWhegTDhw_GQRdbKGF";

const client = createClient(url, key);

async function test() {
  const planId = "ade74eff-b019-4a50-a51b-76ee699b15ec";
  const userIdToDelete = "b494bcd9-321a-4f43-a91a-45d448a4e146";

  console.log("1. Setting waitlist status for bd1d2147-5509-4254-b09a-de7127d69b41 back to waitlist");
  await client.from("plan_participants")
    .update({ status: "waitlist" })
    .eq("plan_id", planId)
    .eq("user_id", "bd1d2147-5509-4254-b09a-de7127d69b41");

  console.log("2. Deleting user b494bcd9-321a-4f43-a91a-45d448a4e146 from plan_participants");
  const { data: delData, error: delError } = await client.from("plan_participants")
    .delete()
    .eq("plan_id", planId)
    .eq("user_id", userIdToDelete)
    .select("*");

  console.log("Delete response:", { delData, delError });

  console.log("3. Immediately fetching plan_participants via fetch-all endpoint...");
  const res = await fetch("http://localhost:3000/api/db/fetch-all?tables=plan_participants");
  const json = await res.json();
  const list = json.data?.plan_participants || [];
  const planList = list.filter(pp => pp.plan_id === planId);
  console.log("List after delete:", planList.map(pp => `${pp.user_id} (${pp.status})`));

  console.log("4. Restoring original state");
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

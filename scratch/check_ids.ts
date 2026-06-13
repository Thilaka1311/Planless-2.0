import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "/Users/thilak/Documents/Planless/Planless Repo /Planless-2.0/.env" });

const url = process.env.SUPABASE_URL || "https://yuuzenyjxxuqahosflob.supabase.co";
const key = process.env.SUPABASE_KEY || "sb_publishable_Ql0r2aGtFaURLnWhegTDhw_GQRdbKGF";

const client = createClient(url, key);

async function main() {
  const { data: users } = await client.from("users").select("*");
  console.log("=== USERS ===");
  console.log(users?.map(u => ({ id: u.id, user_id: u.user_id, full_name: u.full_name })));

  const { data: circleMembers } = await client.from("circle_members").select("*");
  console.log("=== CIRCLE MEMBERS ===");
  console.log(circleMembers);
}

main().catch(console.error);

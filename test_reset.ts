import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const url = process.env.SUPABASE_URL || "https://yuuzenyjxxuqahosflob.supabase.co";
const key = process.env.SUPABASE_KEY || "sb_publishable_Ql0r2aGtFaURLnWhegTDhw_GQRdbKGF";

console.log("Supabase URL:", url);
console.log("Supabase Key configured:", !!key);

const client = createClient(url, key);

const tableDeletes = [
  { name: "plan_participants", pk: "participant_id" },
  { name: "transactions", pk: "transaction_id" },
  { name: "memories", pk: "memory_id" },
  { name: "plans", pk: "plan_id" },
  { name: "circle_members", pk: "circle_member_id" },
  { name: "circles", pk: "circle_id" },
  { name: "users", pk: "user_id" }
];

async function runTest() {
  for (const table of tableDeletes) {
    console.log(`Attempting to truncate ${table.name}...`);
    try {
      const { data, error } = await client.from(table.name).delete().neq(table.pk, "_nonexistent_");
      if (error) {
        console.error(`Error deleting from ${table.name}:`, error);
      } else {
        console.log(`Success truncating ${table.name}!`);
      }
    } catch (err) {
      console.error(`Exception deleting from ${table.name}:`, err);
    }
  }
}

runTest();

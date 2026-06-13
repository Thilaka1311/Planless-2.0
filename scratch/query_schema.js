import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "/Users/thilak/Documents/Planless/Planless Repo /Planless-2.0/.env" });

const url = process.env.SUPABASE_URL || "https://yuuzenyjxxuqahosflob.supabase.co";
const key = process.env.SUPABASE_KEY || "sb_publishable_Ql0r2aGtFaURLnWhegTDhw_GQRdbKGF";

const client = createClient(url, key);

async function test() {
  console.log("=== QUERYING PLAN_PARTICIPANTS CONSTRAINTS & TRIGGERS ===");

  // 1. Constraints
  const { data: constraints, error: cErr } = await client.rpc("get_table_constraints", { t_name: "plan_participants" })
    .catch(() => ({ data: null, error: null })); // RPC might not exist, fallback to direct query if allowed

  console.log("Direct Query table info:");
  const { data: cols, error: colErr } = await client.from("plan_participants").select("*").limit(1);
  console.log("Participants columns:", cols ? Object.keys(cols[0]) : "Error: " + colErr);

  // Direct SQL query using supabase.rpc or fetch
  // Wait, Supabase client doesn't let you run arbitrary SQL unless you have an RPC function or use the backend routes.
  // But our backend has routes that might allow executing SQL or fetching info.
  // Wait, does the backend have dbRouter?
  // Let's check routes/db.ts to see if it has any metadata query endpoints.
}

test();

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: "/Users/thilak/Documents/Planless/Planless Repo /Planless-2.0/.env" });

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://yuuzenyjxxuqahosflob.supabase.co";
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_KEY env vars.");
  process.exit(1);
}

const client = createClient(url, key);

async function checkSystemMessages() {
  const { data, error } = await client
    .from("circle_messages")
    .select("*")
    .eq("message_type", "system")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Failed to fetch system messages:", error);
  } else {
    console.log("Latest system messages in the DB:");
    data.forEach((msg) => {
      console.log(`- [Circle: ${msg.circle_id}] [Plan: ${msg.plan_id}] [Actor: ${msg.system_actor_id}]: ${msg.content} (${msg.created_at})`);
    });
  }
}

checkSystemMessages();

const { createClient } = require("@supabase/supabase-js");

const url = "https://yuuzenyjxxuqahosflob.supabase.co";
const key = "sb_publishable_Ql0r2aGtFaURLnWhegTDhw_GQRdbKGF";

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

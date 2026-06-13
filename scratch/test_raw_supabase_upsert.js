import { createClient } from "@supabase/supabase-js";

async function run() {
  try {
    const url = "https://yuuzenyjxxuqahosflob.supabase.co";
    const key = "sb_publishable_Ql0r2aGtFaURLnWhegTDhw_GQRdbKGF";
    const client = createClient(url, key);

    const payload = [
      {
        id: "c7086b33-d9a2-4a38-b4e4-e42d757cf8e0",
        circle_id: "6ca8ff71-4051-4f2b-88f1-54e03f547841",
        user_id: "416112f6-5596-4fa0-8b4a-e2af1e1b949a",
        role: "co_host",
        joined_at: "2026-06-02T07:25:27.374+00:00"
      }
    ];

    console.log("=== Testing raw Supabase upsert ===");
    const { data, error } = await client.from("circle_members").upsert(payload).select("*");
    console.log("data:", JSON.stringify(data, null, 2));
    console.log("error:", JSON.stringify(error, null, 2));

  } catch (err) {
    console.error("Exception:", err);
  }
}
run();

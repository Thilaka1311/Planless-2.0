import { createClient } from "@supabase/supabase-js";

async function testRaw() {
  const url = "https://yuuzenyjxxuqahosflob.supabase.co";
  const key = "sb_publishable_Ql0r2aGtFaURLnWhegTDhw_GQRdbKGF";
  const client = createClient(url, key);
  
  const planId = "3abdc918-0770-48f7-97dd-fbd74924096c";
  const memoryId = "d87a4192-3bc4-411a-8219-c290a18bb720";
  
  const memoryRecord = {
    id: memoryId,
    plan_id: planId,
    memory_type: "movie",
    status: "pending",
    created_at: new Date().toISOString(),
    editable_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };

  console.log("Upserting with plan_id...");
  const res1 = await client
    .from("memories")
    .upsert([memoryRecord], { onConflict: "plan_id" })
    .select("*");
  console.log("Upsert onConflict plan_id result:", JSON.stringify(res1, null, 2));

  console.log("Plain insert...");
  const res2 = await client
    .from("memories")
    .insert([memoryRecord])
    .select("*");
  console.log("Plain insert result:", JSON.stringify(res2, null, 2));
}

testRaw();

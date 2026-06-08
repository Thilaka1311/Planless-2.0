async function testComplete() {
  const planId = "3abdc918-0770-48f7-97dd-fbd74924096c"; // the active MOVIE NIGHT plan in the DB
  const memoryId = "d87a4192-3bc4-411a-8219-c290a18bb720";
  
  // 1. Complete plan
  console.log("Updating plans table status to completed...");
  const planRes = await fetch("http://localhost:3000/api/db/upsert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      table: "plans",
      records: [{ id: planId, status: "completed" }]
    })
  });
  console.log("Plan Update HTTP Status:", planRes.status);
  console.log("Plan Update Body:", await planRes.json());

  // 2. Insert memory
  console.log("Inserting memories table row...");
  const memoryRecord = {
    id: memoryId,
    plan_id: planId,
    memory_type: "movie",
    status: "pending",
    created_at: new Date().toISOString(),
    editable_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };
  const memRes = await fetch("http://localhost:3000/api/db/upsert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      table: "memories",
      records: [memoryRecord]
    })
  });
  console.log("Memory Insert HTTP Status:", memRes.status);
  console.log("Memory Insert Body:", await memRes.json());
}

testComplete();

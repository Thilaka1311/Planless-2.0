// Full end-to-end test of the completePlan flow
const BASE = "http://localhost:3000/api/db";

async function post(table, records) {
  const res = await fetch(`${BASE}/upsert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table, records })
  });
  const body = await res.json();
  return { status: res.status, body };
}

async function run() {
  // Use an active DEV plan that has participants
  const planId = "87d605c5-3eb3-4f35-896d-54da2f29c443"; // active [DEV] Movie Night
  const memoryId = crypto.randomUUID();

  console.log("=== Step 1: Mark plan completed ===");
  const p1 = await post("plans", [{ id: planId, status: "completed" }]);
  console.log("Status:", p1.status, "Success:", p1.body.success);

  console.log("\n=== Step 2: Insert memory row ===");
  const now = new Date().toISOString();
  const memRow = {
    id: memoryId,
    plan_id: planId,
    memory_type: "movie",
    status: "pending",
    created_at: now,
    editable_until: new Date(Date.now() + 86400000).toISOString()
  };
  const p2 = await post("memories", [memRow]);
  console.log("Status:", p2.status, "Success:", p2.body.success, "Data:", JSON.stringify(p2.body.data));

  console.log("\n=== Step 3: Snapshot going participants to memory_attendees ===");
  // Fetch participants for this plan
  const ppRes = await fetch(`${BASE}/fetch-all?tables=plan_participants`);
  const ppJson = await ppRes.json();
  const allParticipants = ppJson.data?.plan_participants || [];
  const going = allParticipants.filter(pp => pp.plan_id === planId && pp.status === "going");
  console.log("Going participants count:", going.length, going.map(p => p.user_id));

  if (going.length > 0) {
    const attendeeRecords = going.map(gp => ({
      id: crypto.randomUUID(),
      memory_id: memoryId,
      user_id: gp.user_id,
      created_at: now
    }));
    const p3 = await post("memory_attendees", attendeeRecords);
    console.log("Status:", p3.status, "Success:", p3.body.success, "Data:", JSON.stringify(p3.body.data));
  } else {
    console.log("No going participants — skipping attendees insert.");
  }

  console.log("\n=== SUMMARY ===");
  const finalRes = await fetch(`${BASE}/fetch-all?tables=memories,memory_attendees`);
  const finalJson = await finalRes.json();
  console.log("Memories:", JSON.stringify(finalJson.data?.memories));
  console.log("Memory Attendees:", JSON.stringify(finalJson.data?.memory_attendees));
}

run();

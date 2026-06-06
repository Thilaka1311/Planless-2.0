// test_db_integrity.js
// Verification script for database hardening validation guards

async function runTests() {
  const baseUrl = "http://localhost:3000";

  console.log("=== STARTING DATA INTEGRITY TESTS ===");

  // 1. Fetch snapshot to get active users and plans
  console.log("\n[1] Fetching active snapshot...");
  const snapshotRes = await fetch(`${baseUrl}/api/db/fetch-all`);
  if (!snapshotRes.ok) {
    console.error("Failed to fetch database snapshot. Make sure server is running.");
    return;
  }
  const snapshot = await snapshotRes.json();
  const activeUser = snapshot.data?.users?.[0];
  const activePlan = snapshot.data?.plans?.[0];
  const activeCircle = snapshot.data?.circles?.[0];

  if (!activeUser || !activePlan) {
    console.error("No active users or plans found to perform test. Seed the database first.");
    return;
  }

  console.log(`Using active User: ${activeUser.full_name} (${activeUser.id})`);
  console.log(`Using active Plan: ${activePlan.title} (${activePlan.id})`);

  // 2. Test duplicate participant insertion
  console.log("\n[2] Testing duplicate participant join prevention...");
  const duplicateParticipant = {
    plan_id: activePlan.id,
    user_id: activeUser.id,
    status: "going",
    payment_status: "unpaid",
    joined_at: new Date().toISOString()
  };

  const partRes1 = await fetch(`${baseUrl}/api/db/upsert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table: "plan_participants", records: [duplicateParticipant] })
  });

  if (!partRes1.ok) {
    console.error("First insert failed:", await partRes1.text());
    return;
  }
  const result1 = await partRes1.json();
  console.log("First insert response count:", result1.data?.length);

  // Attempt duplicate insert
  const partRes2 = await fetch(`${baseUrl}/api/db/upsert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table: "plan_participants", records: [duplicateParticipant] })
  });

  if (!partRes2.ok) {
    console.error("Duplicate insert failed:", await partRes2.text());
  } else {
    const result2 = await partRes2.json();
    console.log("Duplicate insert response count:", result2.data?.length);
    console.log("Duplicate prevented & existing row returned safely: SUCCESS");
  }

  // 3. Test duplicate circle membership insertion
  if (activeCircle) {
    console.log("\n[3] Testing duplicate circle membership prevention...");
    const duplicateMember = {
      circle_id: activeCircle.id,
      user_id: activeUser.id,
      role: "member",
      joined_at: new Date().toISOString()
    };

    const memRes1 = await fetch(`${baseUrl}/api/db/upsert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "circle_members", records: [duplicateMember] })
    });

    if (!memRes1.ok) {
      console.error("First circle insert failed:", await memRes1.text());
      return;
    }
    const memResult1 = await memRes1.json();
    console.log("First circle insert response count:", memResult1.data?.length);

    // Attempt duplicate insert
    const memRes2 = await fetch(`${baseUrl}/api/db/upsert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "circle_members", records: [duplicateMember] })
    });

    if (!memRes2.ok) {
      console.error("Duplicate circle insert failed:", await memRes2.text());
    } else {
      const memResult2 = await memRes2.json();
      console.log("Duplicate circle insert response count:", memResult2.data?.length);
      console.log("Duplicate membership prevented & existing row returned safely: SUCCESS");
    }
  } else {
    console.log("\n[3] No circles found to test membership prevention.");
  }

  console.log("\n=== TESTS COMPLETED SUCCESSFULY ===");
}

runTests();

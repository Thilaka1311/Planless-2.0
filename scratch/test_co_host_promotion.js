async function run() {
  try {
    // 1. Fetch current circle members
    const fetchRes = await fetch("http://localhost:3000/api/db/fetch-all");
    const fetchJson = await fetchRes.json();
    const members = fetchJson.data?.circle_members || [];

    // Find Medhaj/Arjun in Baddie circle
    // circle: 6ca8ff71-4051-4f2b-88f1-54e03f547841 ("Baddie")
    // user: 416112f6-5596-4fa0-8b4a-e2af1e1b949a
    const memberRecord = members.find(m => m.circle_id === "6ca8ff71-4051-4f2b-88f1-54e03f547841" && m.user_id === "416112f6-5596-4fa0-8b4a-e2af1e1b949a");

    console.log("=== STEP 2: updateCircleMemberRole ===");
    console.log("circleUuid: 6ca8ff71-4051-4f2b-88f1-54e03f547841");
    console.log("memberUserUuid: 416112f6-5596-4fa0-8b4a-e2af1e1b949a");
    console.log("newRole: co_host");

    console.log("\n=== STEP 3: memberRecord (Before) ===");
    console.log("id:", memberRecord.id);
    console.log("circle_id:", memberRecord.circle_id);
    console.log("user_id:", memberRecord.user_id);
    console.log("role:", memberRecord.role);

    const updatedRecord = {
      ...memberRecord,
      role: "co_host"
    };

    console.log("\n=== STEP 3: updatedRecord ===");
    console.log(JSON.stringify(updatedRecord, null, 2));

    // Simulate sending to /api/db/upsert
    console.log("\n=== STEP 4: Inside /api/db/upsert ===");
    console.log("incoming body:", JSON.stringify({ table: "circle_members", records: [updatedRecord] }, null, 2));

    // Simulate the server guard:
    const duplicateMatches = [];
    const sanitizedRecords = [];
    
    // In our test, we use the server's check:
    const { data: existingRows } = { data: [memberRecord] }; // simulated from DB query
    const exists = existingRows && existingRows.length > 0;
    if (exists) {
      const isLegitimateUpdate = updatedRecord.id && updatedRecord.id === existingRows[0].id;
      if (isLegitimateUpdate) {
        sanitizedRecords.push(updatedRecord);
      } else {
        duplicateMatches.push(existingRows[0]);
      }
    } else {
      sanitizedRecords.push(updatedRecord);
    }

    console.log("sanitizedRecords:", JSON.stringify(sanitizedRecords, null, 2));
    console.log("duplicateMatches:", JSON.stringify(duplicateMatches, null, 2));

    console.log("\n=== STEP 5: Supabase Upsert Payload ===");
    console.log("payload:", JSON.stringify(sanitizedRecords, null, 2));

    // Trigger the real mutation via the API
    console.log("\n=== STEP 6: Execute API Request & Print Raw Response ===");
    const res = await fetch("http://localhost:3000/api/db/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "circle_members", records: [updatedRecord] })
    });
    
    console.log("Response Status:", res.status);
    const resJson = await res.json();
    console.log("Response Body:", JSON.stringify(resJson, null, 2));

    // Fetch the database state directly
    console.log("\n=== STEP 7: Database Verification (Post-Request) ===");
    const verifyRes = await fetch("http://localhost:3000/api/db/fetch-all");
    const verifyJson = await verifyRes.json();
    const freshMembers = verifyJson.data?.circle_members || [];
    const freshRecord = freshMembers.find(m => m.id === memberRecord.id);
    console.log("Actual database row (via fetch-all):", JSON.stringify(freshRecord, null, 2));

  } catch (err) {
    console.error("Error:", err);
  }
}
run();

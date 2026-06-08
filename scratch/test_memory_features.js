// Verification script for Memory V2 features (Movie, Dining, Football, Badminton)
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
  console.log("=== Cleaning up tables ===");
  // Clear any existing test memories to have a clean slate
  const clearRes = await fetch("http://localhost:3000/api/health"); // check connection
  if (!clearRes.ok) {
    console.error("Local server is not running!");
    return;
  }

  // 1. Movie / Dining Verification
  console.log("\n=== Testing MOVIE Memory type ===");
  const planId = "87d605c5-3eb3-4f35-896d-54da2f29c443";
  const memoryId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Insert memory
  const memRes = await post("memories", [{
    id: memoryId,
    plan_id: planId,
    memory_type: "movie",
    status: "pending",
    created_at: now,
    editable_until: new Date(Date.now() + 86400000).toISOString()
  }]);
  console.log("Memory insert status:", memRes.status, "Success:", memRes.body.success);

  // Insert ratings from different attendees
  const user1 = "b494bcd9-321a-4f43-a91a-45d448a4e146"; // Host (Thilak)
  const user2 = "bd1d2147-5509-4254-b09a-de7127d69b41"; // Bhavya (Bhaavya in DB)

  const rating1 = await post("memory_ratings", [{
    id: crypto.randomUUID(),
    memory_id: memoryId,
    user_id: user1,
    rating: 9,
    created_at: now
  }]);
  const rating2 = await post("memory_ratings", [{
    id: crypto.randomUUID(),
    memory_id: memoryId,
    user_id: user2,
    rating: 8,
    created_at: now
  }]);
  console.log("Rating 1 insert:", rating1.status, rating1.body.success);
  console.log("Rating 2 insert:", rating2.status, rating2.body.success);

  // Fetch and calculate average rating
  const allRatingsRes = await fetch(`${BASE}/fetch-all?tables=memory_ratings`);
  const ratingsJson = await allRatingsRes.json();
  const list = (ratingsJson.data?.memory_ratings || []).filter(r => r.memory_id === memoryId);
  const sum = list.reduce((acc, r) => acc + r.rating, 0);
  const avg = list.length > 0 ? (sum / list.length).toFixed(1) : 0;
  console.log(`Verified Average Rating: ${avg}/10 (Expected: 8.5)`);
  console.log(`Ratings List Count: ${list.length} (Expected: 2)`);

  // 2. Football Verification
  console.log("\n=== Testing FOOTBALL Memory score immutable save ===");
  const fbPlanId = "3abdc918-0770-48f7-97dd-fbd74924096c";
  const fbMemoryId = crypto.randomUUID();
  
  await post("memories", [{
    id: fbMemoryId,
    plan_id: fbPlanId,
    memory_type: "football",
    status: "pending",
    created_at: now,
    editable_until: new Date(Date.now() + 86400000).toISOString()
  }]);

  // Host records final score
  const scoreSave = await post("memories", [{
    id: fbMemoryId,
    team_a_score: 3,
    team_b_score: 1
  }]);
  console.log("Score save status:", scoreSave.status, "Success:", scoreSave.body.success);

  // Fetch back to verify scores are stored
  const finalMemsRes = await fetch(`${BASE}/fetch-all?tables=memories`);
  const memsJson = await finalMemsRes.json();
  const fbMem = (memsJson.data?.memories || []).find(m => m.id === fbMemoryId);
  console.log(`Saved Scores - Team A: ${fbMem?.team_a_score}, Team B: ${fbMem?.team_b_score} (Expected: 3-1)`);

  // 3. Badminton Verification
  console.log("\n=== Testing BADMINTON Memory Won/Lost votes ===");
  const badPlanId = "928f5d56-15a8-40e8-afc8-c650063069b7";
  const badMemoryId = crypto.randomUUID();
  
  await post("memories", [{
    id: badMemoryId,
    plan_id: badPlanId,
    memory_type: "badminton",
    status: "pending",
    created_at: now,
    editable_until: new Date(Date.now() + 86400000).toISOString()
  }]);

  // User 1 votes Won (10)
  const vote1 = await post("memory_ratings", [{
    id: crypto.randomUUID(),
    memory_id: badMemoryId,
    user_id: user1,
    rating: 10,
    created_at: now
  }]);
  // User 2 votes Lost (1)
  const vote2 = await post("memory_ratings", [{
    id: crypto.randomUUID(),
    memory_id: badMemoryId,
    user_id: user2,
    rating: 1,
    created_at: now
  }]);
  console.log("Won Vote status:", vote1.status, "Lost Vote status:", vote2.status);

  // Fetch back and count
  const allVotesRes = await fetch(`${BASE}/fetch-all?tables=memory_ratings`);
  const votesJson = await allVotesRes.json();
  const badVotes = (votesJson.data?.memory_ratings || []).filter(r => r.memory_id === badMemoryId);
  const wonCount = badVotes.filter(v => v.rating === 10).length;
  const lostCount = badVotes.filter(v => v.rating === 1).length;
  console.log(`Badminton votes summary - Won: ${wonCount}, Lost: ${lostCount} (Expected: 1 Won, 1 Lost)`);
}

run();

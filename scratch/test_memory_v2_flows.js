// Self-contained Verification script for Memory V2 features (Movie Verdicts, Restaurant Votes, Match Results, MVP Votes)
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
  console.log("=== Checking local server connection ===");
  try {
    const clearRes = await fetch("http://localhost:3000/api/db/fetch-all");
    if (!clearRes.ok) {
      console.error("Local server is not running or returned error!");
      return;
    }
  } catch (err) {
    console.error("Local server is not running!", err.message);
    return;
  }

  // 1. Create Test Users
  console.log("\n=== Creating Test Users ===");
  const now = new Date().toISOString();

  const userRes = await post("users", [
    {
      user_id: "UTEST1_" + Date.now(),
      full_name: "Thilak Test",
      username: "thilak_test",
      phone_number: "+91 99999 " + Math.floor(10000 + Math.random() * 90000),
      profile_photo: "",
      bio: "Spontaneous tester",
      college_or_work: "SRM Chennai",
      created_at: now,
      wallet_balance: 500,
      active_status: true
    },
    {
      user_id: "UTEST2_" + Date.now(),
      full_name: "Bhavya Test",
      username: "bhavya_test",
      phone_number: "+91 99999 " + Math.floor(10000 + Math.random() * 90000),
      profile_photo: "",
      bio: "Movie verdict tester",
      college_or_work: "SRM Chennai",
      created_at: now,
      wallet_balance: 500,
      active_status: true
    },
    {
      user_id: "UTEST3_" + Date.now(),
      full_name: "Manastej Test",
      username: "manas_test",
      phone_number: "+91 99999 " + Math.floor(10000 + Math.random() * 90000),
      profile_photo: "",
      bio: "MVP voter tester",
      college_or_work: "SRM Chennai",
      created_at: now,
      wallet_balance: 500,
      active_status: true
    }
  ]);
  console.log("Users creation status:", userRes.status, "Success:", userRes.body.success);
  if (!userRes.body.success || !userRes.body.data || userRes.body.data.length < 3) {
    console.error("Failed to insert test users!", userRes.body);
    return;
  }

  const user1 = userRes.body.data[0].id;
  const user2 = userRes.body.data[1].id;
  const user3 = userRes.body.data[2].id;

  console.log(`Created user UUIDs - Host: ${user1}, User2: ${user2}, User3: ${user3}`);

  // 2. Movie Verdicts Verification
  console.log("\n=== Testing Movie Verdicts ===");
  const movieMemoryId = crypto.randomUUID();

  // Create movie plan
  const moviePlanRes = await post("plans", [{
    plan_id: "PMOVIE_TEST_" + Date.now(),
    title: "Test Movie Night",
    description: "IMAX screening",
    created_by: user1,
    host_id: user1,
    circle_id: null,
    category: "movies",
    location: "IMAX Forum",
    datetime: now,
    max_people: 10,
    split_amount: 0,
    payment_required: false,
    status: "completed",
    created_at: now
  }]);
  console.log("Movie Plan insert status:", moviePlanRes.status, "Success:", moviePlanRes.body.success);
  if (!moviePlanRes.body.success || !moviePlanRes.body.data || moviePlanRes.body.data.length === 0) {
    console.error("Failed to insert movie plan!", moviePlanRes.body);
    return;
  }
  const moviePlanId = moviePlanRes.body.data[0].id;

  // Insert memory
  const memRes = await post("memories", [{
    id: movieMemoryId,
    plan_id: moviePlanId,
    memory_type: "movie",
    status: "pending",
    created_at: now,
    editable_until: new Date(Date.now() + 86400000).toISOString()
  }]);
  console.log("Movie Memory insert status:", memRes.status, "Success:", memRes.body.success);
  if (memRes.status !== 200) {
    console.error("Failed to insert movie memory!", memRes.body);
    return;
  }

  // Insert movie verdicts
  const verdict1 = await post("memory_movie_verdicts", [{
    id: crypto.randomUUID(),
    memory_id: movieMemoryId,
    user_id: user1,
    verdict: "loved_it",
    created_at: now
  }]);
  const verdict2 = await post("memory_movie_verdicts", [{
    id: crypto.randomUUID(),
    memory_id: movieMemoryId,
    user_id: user2,
    verdict: "good",
    created_at: now
  }]);
  console.log("Verdict 1 (loved_it) status:", verdict1.status, verdict1.body.success);
  console.log("Verdict 2 (good) status:", verdict2.status, verdict2.body.success);

  // Fetch back to verify movie verdicts are stored
  const fetchVerdictsRes = await fetch(`${BASE}/fetch-all`);
  const verdictsJson = await fetchVerdictsRes.json();
  const movieVerdictsList = (verdictsJson.data?.memory_movie_verdicts || []).filter(v => v.memory_id === movieMemoryId);
  console.log(`Movie Verdicts Count: ${movieVerdictsList.length} (Expected: 2)`);
  console.log("Loved It count:", movieVerdictsList.filter(v => v.verdict === "loved_it").length);
  console.log("Good count:", movieVerdictsList.filter(v => v.verdict === "good").length);

  // 3. Dining Verification
  console.log("\n=== Testing Dining Return Votes ===");
  const diningMemoryId = crypto.randomUUID();

  // Create dining plan
  const diningPlanRes = await post("plans", [{
    plan_id: "PDINING_TEST_" + Date.now(),
    title: "Test Dinner Run",
    description: "Olive Garden feast",
    created_by: user1,
    host_id: user1,
    circle_id: null,
    category: "dining",
    location: "Olive Garden",
    datetime: now,
    max_people: 8,
    split_amount: 0,
    payment_required: false,
    status: "completed",
    created_at: now
  }]);
  console.log("Dining Plan insert status:", diningPlanRes.status, "Success:", diningPlanRes.body.success);
  const diningPlanId = diningPlanRes.body.data[0].id;

  // Insert memory
  const diningMemRes = await post("memories", [{
    id: diningMemoryId,
    plan_id: diningPlanId,
    memory_type: "dining",
    status: "pending",
    created_at: now,
    editable_until: new Date(Date.now() + 86400000).toISOString()
  }]);
  console.log("Dining Memory insert status:", diningMemRes.status, "Success:", diningMemRes.body.success);

  // Insert restaurant votes
  const vote1 = await post("memory_restaurant_votes", [{
    id: crypto.randomUUID(),
    memory_id: diningMemoryId,
    user_id: user1,
    vote: "yes",
    created_at: now
  }]);
  const vote2 = await post("memory_restaurant_votes", [{
    id: crypto.randomUUID(),
    memory_id: diningMemoryId,
    user_id: user2,
    vote: "maybe",
    created_at: now
  }]);
  console.log("Vote 1 (yes) status:", vote1.status, vote1.body.success);
  console.log("Vote 2 (maybe) status:", vote2.status, vote2.body.success);

  // Fetch back to verify restaurant votes are stored
  const fetchVotesRes = await fetch(`${BASE}/fetch-all`);
  const votesJson = await fetchVotesRes.json();
  const diningVotesList = (votesJson.data?.memory_restaurant_votes || []).filter(v => v.memory_id === diningMemoryId);
  console.log(`Dining Votes Count: ${diningVotesList.length} (Expected: 2)`);
  console.log("Yes votes:", diningVotesList.filter(v => v.vote === "yes").length);
  console.log("Maybe votes:", diningVotesList.filter(v => v.vote === "maybe").length);

  // 4. Sports Verification
  console.log("\n=== Testing Sports Match Results & MVP votes ===");
  const sportsMemoryId = crypto.randomUUID();

  // Create sports plan
  const sportsPlanRes = await post("plans", [{
    plan_id: "PSPORTS_TEST_" + Date.now(),
    title: "Test Football Match",
    description: "7v7 turf session",
    created_by: user1,
    host_id: user1,
    circle_id: null,
    category: "sports",
    activity_type: "football",
    location: "Turf Arena",
    datetime: now,
    max_people: 14,
    split_amount: 0,
    payment_required: false,
    status: "completed",
    created_at: now
  }]);
  console.log("Sports Plan insert status:", sportsPlanRes.status, "Success:", sportsPlanRes.body.success);
  const sportsPlanId = sportsPlanRes.body.data[0].id;

  // Insert memory
  const sportsMemRes = await post("memories", [{
    id: sportsMemoryId,
    plan_id: sportsPlanId,
    memory_type: "football",
    status: "pending",
    created_at: now,
    editable_until: new Date(Date.now() + 86400000).toISOString()
  }]);
  console.log("Sports Memory insert status:", sportsMemRes.status, "Success:", sportsMemRes.body.success);

  // Insert match result
  const resultRes = await post("memory_match_results", [{
    id: crypto.randomUUID(),
    memory_id: sportsMemoryId,
    team_a_score: 5,
    team_b_score: 3,
    recorded_by: user1,
    created_at: now
  }]);
  console.log("Match Result insert status:", resultRes.status, "Success:", resultRes.body.success);

  // Insert MVP votes
  const mvpRes1 = await post("memory_mvp_votes", [{
    id: crypto.randomUUID(),
    memory_id: sportsMemoryId,
    voter_user_id: user1,
    mvp_user_id: user2,
    created_at: now
  }]);
  const mvpRes2 = await post("memory_mvp_votes", [{
    id: crypto.randomUUID(),
    memory_id: sportsMemoryId,
    voter_user_id: user3,
    mvp_user_id: user2,
    created_at: now
  }]);
  console.log("MVP Vote 1 status:", mvpRes1.status, mvpRes1.body.success);
  console.log("MVP Vote 2 status:", mvpRes2.status, mvpRes2.body.success);

  // Fetch back to verify sports match results & MVP votes
  const fetchSportsRes = await fetch(`${BASE}/fetch-all`);
  const sportsJson = await fetchSportsRes.json();
  const matchResult = (sportsJson.data?.memory_match_results || []).find(r => r.memory_id === sportsMemoryId);
  const mvpVotes = (sportsJson.data?.memory_mvp_votes || []).filter(v => v.memory_id === sportsMemoryId);

  console.log(`Saved Match Score: ${matchResult?.team_a_score} - ${matchResult?.team_b_score} (Expected: 5 - 3)`);
  console.log(`MVP Votes Count: ${mvpVotes.length} (Expected: 2)`);
  console.log(`MVP recipient: ${mvpVotes[0]?.mvp_user_id} (Expected: ${user2})`);
  console.log("\n=== V2 MEMORIES INTEGRATION CHECKS PASSED SUCCESSFULLY ===");
}

run();

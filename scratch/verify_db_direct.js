// scratch/verify_db_direct.js
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

async function verify() {
  const url = process.env.SUPABASE_URL || "https://yuuzenyjxxuqahosflob.supabase.co";
  const key = process.env.SUPABASE_KEY || "sb_publishable_Ql0r2aGtFaURLnWhegTDhw_GQRdbKGF";

  console.log("Connecting directly to Supabase:", url);
  const supabase = createClient(url, key);

  console.log("\n--- Verification 1: Fetching active user and plan ---");
  const { data: users, error: userErr } = await supabase.from("users").select("*").limit(1);
  if (userErr || !users || users.length === 0) {
    console.error("Failed to fetch user:", userErr);
    return;
  }
  const user = users[0];
  console.log(`Found user: ${user.full_name} (${user.id})`);

  const { data: plans, error: planErr } = await supabase.from("plans").select("*").limit(1);
  if (planErr || !plans || plans.length === 0) {
    console.error("Failed to fetch plan:", planErr);
    return;
  }
  const plan = plans[0];
  console.log(`Found plan: ${plan.title} (${plan.id})`);

  console.log("\n--- Verification 2: Testing Unique Participant Constraint directly on DB ---");
  // Clean up any existing matching participant first to have a clean test state, or use existing
  const { data: existingParts } = await supabase
    .from("plan_participants")
    .select("*")
    .eq("plan_id", plan.id)
    .eq("user_id", user.id);

  if (existingParts && existingParts.length > 0) {
    console.log("Participant link already exists. Attempting to insert a duplicate to trigger database constraint...");
  } else {
    console.log("No existing participant link. Creating one first...");
    const { error: insertErr } = await supabase
      .from("plan_participants")
      .insert([{ plan_id: plan.id, user_id: user.id, status: "going", payment_status: "unpaid", joined_at: new Date().toISOString() }]);
    if (insertErr) {
      console.error("Failed to insert initial participant:", insertErr);
      return;
    }
    console.log("Initial participant inserted successfully.");
  }

  // Now insert duplicate
  console.log("Inserting duplicate participant row directly to database...");
  const { data: dupData, error: dupErr } = await supabase
    .from("plan_participants")
    .insert([{ plan_id: plan.id, user_id: user.id, status: "going", payment_status: "unpaid", joined_at: new Date().toISOString() }])
    .select();

  if (dupErr) {
    console.log("Database successfully rejected duplicate insert!");
    console.log("Error Code:", dupErr.code);
    console.log("Error Message:", dupErr.message);
    console.log("Error Details:", dupErr.details);
    if (dupErr.code === "23505" || dupErr.message.includes("unique_plan_user_participant") || dupErr.details.includes("unique_plan_user_participant")) {
      console.log(">>> SUCCESS: Database-level unique constraint 'unique_plan_user_participant' is ACTIVE and working!");
    } else {
      console.log(">>> WARNING: Received a different database error code than 23505.");
    }
  } else {
    console.error(">>> FAILURE: Database allowed duplicate participant insert! Row count created:", dupData?.length);
  }

  console.log("\n--- Verification 3: Testing Circle Member Constraint directly on DB ---");
  const { data: circles } = await supabase.from("circles").select("*").limit(1);
  if (circles && circles.length > 0) {
    const circle = circles[0];
    console.log(`Found circle: ${circle.name} (${circle.id})`);

    const { data: existingMembers } = await supabase
      .from("circle_members")
      .select("*")
      .eq("circle_id", circle.id)
      .eq("user_id", user.id);

    if (existingMembers && existingMembers.length > 0) {
      console.log("Circle member already exists. Attempting to insert duplicate to trigger database constraint...");
    } else {
      console.log("No existing circle member. Creating one first...");
      const { error: insertMemErr } = await supabase
        .from("circle_members")
        .insert([{ circle_id: circle.id, user_id: user.id, role: "member", joined_at: new Date().toISOString() }]);
      if (insertMemErr) {
        console.error("Failed to insert initial circle member:", insertMemErr);
        return;
      }
      console.log("Initial circle member inserted successfully.");
    }

    console.log("Inserting duplicate circle member directly to database...");
    const { data: dupMemData, error: dupMemErr } = await supabase
      .from("circle_members")
      .insert([{ circle_id: circle.id, user_id: user.id, role: "member", joined_at: new Date().toISOString() }])
      .select();

    if (dupMemErr) {
      console.log("Database successfully rejected duplicate circle membership insert!");
      console.log("Error Code:", dupMemErr.code);
      console.log("Error Message:", dupMemErr.message);
      console.log("Error Details:", dupMemErr.details);
      if (dupMemErr.code === "23505" || dupMemErr.message.includes("unique") || dupMemErr.details.includes("unique")) {
        console.log(">>> SUCCESS: Database-level unique constraint for circle membership is ACTIVE and working!");
      }
    } else {
      console.error(">>> FAILURE: Database allowed duplicate circle member insert! Row count created:", dupMemData?.length);
    }
  } else {
    console.log("No circles found in database to test.");
  }
}

verify();

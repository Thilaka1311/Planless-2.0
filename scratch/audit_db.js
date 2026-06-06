const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const url = process.env.SUPABASE_URL || "https://yuuzenyjxxuqahosflob.supabase.co";
const key = process.env.SUPABASE_KEY || "sb_publishable_Ql0r2aGtFaURLnWhegTDhw_GQRdbKGF";

const client = createClient(url, key);

async function run() {
  try {
    console.log("Fetching snapshot from Supabase...");
    const tables = ["users", "circles", "circle_members", "plans", "plan_participants", "transactions", "memories", "user_stats", "notifications", "user_data", "plan_reminders"];
    const results = {};
    for (const t of tables) {
      const { data, error } = await client.from(t).select("*");
      if (error) {
        console.error(`Error fetching ${t}:`, error.message);
      } else {
        results[t] = data;
        console.log(`Table ${t}: ${data.length} records`);
      }
    }

    console.log("\n====================================");
    console.log("1. ENUM AUDIT (Unique values in DB columns)");
    console.log("====================================");
    
    if (results.plan_participants) {
      const statuses = [...new Set(results.plan_participants.map(p => p.status))];
      console.log("participant_status (plan_participants.status):", statuses);
      const paymentStatuses = [...new Set(results.plan_participants.map(p => p.payment_status))];
      console.log("payment_status (plan_participants.payment_status):", paymentStatuses);
    }

    if (results.plans) {
      const planStatuses = [...new Set(results.plans.map(p => p.status))];
      console.log("plan_status (plans.status):", planStatuses);
      const acceptanceStatuses = [...new Set(results.plans.map(p => p.acceptance_status))];
      console.log("plans.acceptance_status:", acceptanceStatuses);
    }

    if (results.circle_members) {
      const roles = [...new Set(results.circle_members.map(m => m.role))];
      console.log("circle_members.role:", roles);
    }

    if (results.circles) {
      const privacies = [...new Set(results.circles.map(c => c.privacy))];
      console.log("circle_privacy (circles.privacy):", privacies);
    }

    if (results.transactions) {
      const txTypes = [...new Set(results.transactions.map(t => t.transaction_type))];
      console.log("transactions.transaction_type:", txTypes);
      const txStatuses = [...new Set(results.transactions.map(t => t.status))];
      console.log("transactions.status:", txStatuses);
    }

    console.log("\n====================================");
    console.log("2. SCHEMA / STRUCTURE AUDIT");
    console.log("====================================");
    if (results.plans && results.plans.length > 0) {
      console.log("First plan schema keys:", Object.keys(results.plans[0]));
    }
    if (results.plan_participants && results.plan_participants.length > 0) {
      console.log("First plan_participant schema keys:", Object.keys(results.plan_participants[0]));
    }
    if (results.circle_members && results.circle_members.length > 0) {
      console.log("First circle_member schema keys:", Object.keys(results.circle_members[0]));
    }
  } catch (err) {
    console.error("Execution failed:", err);
  }
}

run();

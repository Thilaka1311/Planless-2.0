import { Router } from "express";
import { getSupabaseClient } from "../server";

const router = Router();

router.get("/fetch-all", async (req, res) => {
  try {
    const client = getSupabaseClient();
    if (!client) {
      res.json({
        configured: false,
        tables_missing: true,
        missing_tables: ["users", "circles", "circle_members", "plans", "plan_participants", "transactions", "memories"],
        data: null
      });
      return;
    }

    const tables = [
      "users",
      "circles",
      "circle_members",
      "plans",
      "plan_participants",
      "transactions",
      "memories",
      "user_stats",
      "notifications",
      "user_data",
      "plan_reminders"
    ];

    const results: Record<string, any[]> = {};
    const missingTables: string[] = [];

    await Promise.all(
      tables.map(async (table) => {
        try {
          const { data, error } = await client.from(table).select("*");
          if (error) {
            if (error.code === "42P01" || error.message?.includes("does not exist") || error.message?.includes("relation")) {
              missingTables.push(table);
            } else {
              throw error;
            }
          } else {
            results[table] = data || [];
            if (table === "plans") {
              const plansList = data || [];
              const uuids = plansList.map(p => p.id);
              const uniqueUuids = [...new Set(uuids)];
              const duplicates = uuids.filter((item, index) => uuids.indexOf(item) !== index);
              console.log(`[Supabase DB Audit] Raw plans count from database: ${plansList.length}`);
              console.log(`[Supabase DB Audit] Number of unique plan UUIDs: ${uniqueUuids.length}`);
              if (duplicates.length > 0) {
                console.error(`[Supabase DB Audit] Duplicate plan UUIDs detected:`, duplicates);
              }
            }
            if (table === "plan_participants") {
              console.log(`[Supabase DB Audit] Raw plan_participants count: ${data?.length || 0}`);
            }
          }
        } catch (tableErr: any) {
          console.warn(`[Supabase Fetch Sync] Table ${table} not queryable yet:`, tableErr.message || tableErr);
          missingTables.push(table);
        }
      })
    );

    res.json({
      configured: true,
      tables_missing: missingTables.length > 0,
      missing_tables: missingTables,
      data: results
    });
  } catch (err: any) {
    console.error("[Supabase Fetch Error]:", err);
    res.status(500).json({ error: err.message || "Failed to sync tables from Supabase." });
  }
});

router.post("/upsert", async (req, res) => {
  try {
    const { table, records } = req.body;
    if (!table || !records || !Array.isArray(records)) {
      res.status(400).json({ error: "Invalid payload parameters. Expected 'table' name and 'records' array." });
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      res.status(503).json({ error: "Supabase client key or endpoint is not initialized." });
      return;
    }

    const isInsert = records.every(r => r.id === undefined || r.id === null);
    const query = isInsert ? client.from(table).insert(records) : client.from(table).upsert(records);
    
    const { data, error } = await query.select("*");
    if (error) {
      console.error(`[Supabase DB Operation Sync] Error writing to ${table}:`, error);
      res.status(500).json({ error: error.message, details: error.details, hint: error.hint });
      return;
    }

    res.json({ success: true, count: records.length, data });
  } catch (error: any) {
    console.error("[Supabase Sync Proxy Error]:", error);
    res.status(500).json({ error: error.message || "Internal server error syncing row database changes." });
  }
});

router.post("/delete", async (req, res) => {
  try {
    const { table, match } = req.body;
    if (!table || !match || typeof match !== "object") {
      res.status(400).json({ error: "Invalid payload parameters. Expected 'table' name and 'match' object." });
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      res.status(503).json({ error: "Supabase client key or endpoint is not initialized." });
      return;
    }

    let query = client.from(table).delete();
    for (const [key, val] of Object.entries(match)) {
      query = query.eq(key, val);
    }

    const { data, error } = await query.select("*");
    if (error) {
      console.error(`[Supabase DB Operation Sync] Error deleting from ${table}:`, error);
      res.status(500).json({ error: error.message, details: error.details, hint: error.hint });
      return;
    }

    res.json({ success: true, count: data?.length || 0, data });
  } catch (error: any) {
    console.error("[Supabase Sync Proxy Error]:", error);
    res.status(500).json({ error: error.message || "Internal server error deleting database changes." });
  }
});

router.post("/reset", async (req, res) => {
  try {
    const client = getSupabaseClient();
    if (!client) {
      res.json({ success: true, message: "No Supabase client configured. Local reset only." });
      return;
    }

    const { error: truncateError } = await client.rpc("truncate_all_tables");
    if (truncateError) {
      console.warn("[Supabase Reset Warning] Failed to truncate tables via RPC:", truncateError);
    }

    const { error: seqError } = await client.rpc("reset_all_sequences");
    if (seqError) {
      console.warn("[Supabase Reset Warning] Failed to reset sequential counters:", seqError);
    }

    res.json({ success: true, message: "Supabase database truncated and sequential counters reset successfully!" });
  } catch (err: any) {
    console.error("[Supabase Reset Error]:", err);
    res.status(500).json({ error: err.message || "Failed to reset Supabase database." });
  }
});

// ─── Update Plan Acceptance Status ────────────────────────────────────────────
// Called when all participants have accepted → transitions plan to "confirmed"
// so host can see "Pay Now".
router.post("/update-plan-status", async (req, res) => {
  try {
    const { plan_id, acceptance_status } = req.body;
    if (!plan_id || !acceptance_status) {
      res.status(400).json({ error: "plan_id and acceptance_status are required." });
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      res.status(503).json({ error: "Supabase client not configured." });
      return;
    }

    const { data, error } = await client
      .from("plans")
      .update({ acceptance_status })
      .eq("id", plan_id)
      .select("*");

    if (error) {
      console.error("[update-plan-status] Error:", error);
      res.status(500).json({ error: error.message });
      return;
    }

    console.log(`[update-plan-status] Plan ${plan_id} → acceptance_status: ${acceptance_status}`);
    res.json({ success: true, data });
  } catch (err: any) {
    console.error("[update-plan-status] Exception:", err);
    res.status(500).json({ error: err.message || "Failed to update plan status." });
  }
});

// ─── Host Pay ─────────────────────────────────────────────────────────────────
// Called when host presses "Pay Now" after plan is confirmed.
router.post("/host-pay", async (req, res) => {
  try {
    const { plan_id, host_user_id, cost_per_person } = req.body;
    if (!plan_id || !host_user_id || !cost_per_person) {
      res.status(400).json({ error: "plan_id, host_user_id, and cost_per_person are required." });
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      res.status(503).json({ error: "Supabase client not configured." });
      return;
    }

    // 1. Fetch all accepted participants for this plan (excluding host)
    const { data: participants, error: ppErr } = await client
      .from("plan_participants")
      .select("*")
      .eq("plan_id", plan_id)
      .in("status", ["accepted", "going"]);

    if (ppErr) {
      console.error("[host-pay] Failed to fetch participants:", ppErr);
      res.status(500).json({ error: ppErr.message });
      return;
    }

    const acceptedParticipants = (participants || []).filter(
      (p: any) => p.user_id !== host_user_id
    );

    const totalCost = cost_per_person * acceptedParticipants.length;
    console.log(`[host-pay] Plan: ${plan_id}, accepted: ${acceptedParticipants.length}, total: ₹${totalCost}`);

    // 2. Create split transaction records for each accepted participant
    const transactions = acceptedParticipants.map((p: any, idx: number) => ({
      transaction_id: `T_SPLIT_${Date.now()}_${idx}`,
      sender_id: host_user_id,
      receiver_id: p.user_id,
      plan_id,
      amount: cost_per_person,
      transaction_type: "split_payment",
      status: "success",
      timestamp: new Date().toISOString(),
    }));

    if (transactions.length > 0) {
      const { error: txErr } = await client.from("transactions").insert(transactions);
      if (txErr) {
        console.error("[host-pay] Failed to insert transactions:", txErr);
        res.status(500).json({ error: txErr.message });
        return;
      }
    }

    // 3. Update participant payment_status → "owed" for each accepted participant
    for (const p of acceptedParticipants) {
      await client
        .from("plan_participants")
        .update({ payment_status: "owed" })
        .eq("id", p.id);
    }

    // 4. Update plan → acceptance_status: "paid", status: "paid"
    await client
      .from("plans")
      .update({ acceptance_status: "paid", status: "paid" })
      .eq("id", plan_id);

    console.log(`[host-pay] Successfully processed payment for plan ${plan_id}. Total: ₹${totalCost}`);
    res.json({
      success: true,
      total_cost: totalCost,
      split_count: acceptedParticipants.length,
      cost_per_person,
      transactions,
    });
  } catch (err: any) {
    console.error("[host-pay] Exception:", err);
    res.status(500).json({ error: err.message || "Failed to process host payment." });
  }
});

// ─── Book Now (Sports Flow coordination finalization) ─────────────────────────
router.post("/book-now", async (req, res) => {
  try {
    const { plan_id, host_user_id } = req.body;
    if (!plan_id || !host_user_id) {
      res.status(400).json({ error: "plan_id and host_user_id are required." });
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      res.status(503).json({ error: "Supabase client not configured." });
      return;
    }

    // 1. Fetch the plan
    const { data: planData, error: planErr } = await client
      .from("plans")
      .select("*")
      .eq("id", plan_id)
      .single();

    if (planErr || !planData) {
      res.status(404).json({ error: "Plan not found." });
      return;
    }

    // 2. Fetch all participants for this plan to calculate confirmed count
    const { data: participants, error: ppErr } = await client
      .from("plan_participants")
      .select("*")
      .eq("plan_id", plan_id);

    if (ppErr) {
      res.status(500).json({ error: ppErr.message });
      return;
    }

    const confirmedParticipants = (participants || []).filter(
      (p: any) => p.status === "accepted" || p.status === "going" || p.status === "host"
    );
    const confirmedCount = confirmedParticipants.length;

    // 3. Slot Availability Protection: Check conflicts
    const { data: conflictingPlans, error: conflictErr } = await client
      .from("plans")
      .select("*")
      .eq("location", planData.location)
      .eq("slot_label", planData.slot_label)
      .eq("status", "CONFIRMED");

    if (conflictErr) {
      res.status(500).json({ error: conflictErr.message });
      return;
    }

    if (conflictingPlans && conflictingPlans.length > 0) {
      await client
        .from("plans")
        .update({ status: "SLOT_UNAVAILABLE" })
        .eq("id", plan_id);
      res.json({ success: true, status: "SLOT_UNAVAILABLE" });
      return;
    }

    const finalTotalCost = planData.venue_cost || 0;
    const costPerPerson = confirmedCount > 0 ? Math.round(finalTotalCost / confirmedCount) : 0;

    // 4. Fetch host user wallet
    const { data: hostUser, error: userErr } = await client
      .from("users")
      .select("*")
      .eq("id", host_user_id)
      .single();

    if (userErr || !hostUser) {
      res.status(404).json({ error: "Host user not found." });
      return;
    }

    if (hostUser.wallet_balance < finalTotalCost) {
      res.status(400).json({ error: `Insufficient wallet balance. Total booking cost is ₹${finalTotalCost}, but wallet balance is ₹${hostUser.wallet_balance}.` });
      return;
    }

    // 5. Deduct balance from host
    const newBalance = hostUser.wallet_balance - finalTotalCost;
    const { error: updateBalErr } = await client
      .from("users")
      .update({ wallet_balance: newBalance })
      .eq("id", host_user_id);

    if (updateBalErr) {
      res.status(500).json({ error: updateBalErr.message });
      return;
    }

    // 6. Create booking transaction record
    const { error: txErr } = await client
      .from("transactions")
      .insert({
        transaction_id: `T_BOOK_${Date.now()}`,
        sender_id: host_user_id,
        receiver_id: null,
        plan_id: plan_id,
        amount: finalTotalCost,
        transaction_type: "split_payment",
        status: "success",
        timestamp: new Date().toISOString(),
      });

    if (txErr) {
      res.status(500).json({ error: txErr.message });
      return;
    }

    // 7. Update plan status to CONFIRMED
    await client
      .from("plans")
      .update({ status: "CONFIRMED", split_amount: costPerPerson })
      .eq("id", plan_id);

    res.json({ success: true, status: "CONFIRMED", finalTotalCost });
  } catch (err: any) {
    console.error("[book-now] Exception:", err);
    res.status(500).json({ error: err.message || "Failed to process booking." });
  }
});

export default router;

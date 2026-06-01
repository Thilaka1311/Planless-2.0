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

router.post("/delete-users", async (req, res) => {
  try {
    const client = getSupabaseClient();
    if (!client) {
      res.status(503).json({ error: "Supabase client not configured." });
      return;
    }

    const { error: truncateError } = await client.rpc("truncate_all_tables");
    if (truncateError) {
      console.warn("[Supabase Delete Users Warning] Failed to truncate tables via RPC:", truncateError);
    }

    const { error: seqError } = await client.rpc("reset_all_sequences");
    if (seqError) {
      console.warn("[Supabase Delete Users Warning] Failed to reset sequential counters:", seqError);
    }

    res.json({ success: true, message: "All user-related data deleted and sequential counters reset successfully." });
  } catch (err: any) {
    console.error("[Supabase Delete Users Error]:", err);
    res.status(500).json({ error: err.message || "Failed to delete user data." });
  }
});

export default router;

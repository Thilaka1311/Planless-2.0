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

    // Support targeted table fetching
    const requestedTables = req.query.tables ? String(req.query.tables).split(",") : null;

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
        if (requestedTables && !requestedTables.includes(table)) {
          return;
        }
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

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (val: any) => typeof val === "string" && uuidRegex.test(val);

router.post("/upsert", async (req, res) => {
  try {
    const { table, records } = req.body;
    if (!table || !records || !Array.isArray(records)) {
      res.status(400).json({ error: "Invalid payload parameters. Expected 'table' name and 'records' array." });
      return;
    }

    // Runtime UUID validation guards
    for (const rec of records) {
      if (table === "plan_participants") {
        if (rec.plan_id && !isUuid(rec.plan_id)) {
          console.warn(`[DB Integrity Warning] plan_participants mutation has non-UUID plan_id: "${rec.plan_id}"`);
        }
        if (rec.user_id && !isUuid(rec.user_id)) {
          console.warn(`[DB Integrity Warning] plan_participants mutation has non-UUID user_id: "${rec.user_id}"`);
        }
      } else if (table === "circle_members") {
        if (rec.circle_id && !isUuid(rec.circle_id)) {
          console.warn(`[DB Integrity Warning] circle_members mutation has non-UUID circle_id: "${rec.circle_id}"`);
        }
        if (rec.user_id && !isUuid(rec.user_id)) {
          console.warn(`[DB Integrity Warning] circle_members mutation has non-UUID user_id: "${rec.user_id}"`);
        }
      } else if (table === "plans") {
        if (rec.created_by && !isUuid(rec.created_by)) {
          console.warn(`[DB Integrity Warning] plans mutation has non-UUID created_by: "${rec.created_by}"`);
        }
        if (rec.circle_id && !isUuid(rec.circle_id)) {
          console.warn(`[DB Integrity Warning] plans mutation has non-UUID circle_id: "${rec.circle_id}"`);
        }
      } else if (table === "transactions") {
        if (rec.sender_id && rec.sender_id !== "SYSTEM" && rec.sender_id !== "UPI" && !isUuid(rec.sender_id)) {
          console.warn(`[DB Integrity Warning] transactions mutation has non-UUID sender_id: "${rec.sender_id}"`);
        }
        if (rec.receiver_id && rec.receiver_id !== "SYSTEM" && rec.receiver_id !== "UPI" && !isUuid(rec.receiver_id)) {
          console.warn(`[DB Integrity Warning] transactions mutation has non-UUID receiver_id: "${rec.receiver_id}"`);
        }
        if (rec.plan_id && !isUuid(rec.plan_id)) {
          console.warn(`[DB Integrity Warning] transactions mutation has non-UUID plan_id: "${rec.plan_id}"`);
        }
      }
    }

    const client = getSupabaseClient();
    if (!client) {
      res.status(503).json({ error: "Supabase client key or endpoint is not initialized." });
      return;
    }

    // Guard: Prevent duplicate plan_participants joins/invitations
    if (table === "plan_participants") {
      const sanitizedRecords = [];
      const duplicateMatches = [];

      for (const rec of records) {
        if (!rec.plan_id || !rec.user_id) {
          sanitizedRecords.push(rec);
          continue;
        }

        // Query database to see if record exists
        const { data: existingRows } = await client
          .from("plan_participants")
          .select("*")
          .eq("plan_id", rec.plan_id)
          .eq("user_id", rec.user_id);

        if (existingRows && existingRows.length > 0) {
          // If already exists, keep the existing record (and merge updates if status was changed, or fail safely)
          // If a new status was requested, we can update it or keep it depending on requirements.
          // To fail safely, we keep it and don't insert a duplicate.
          duplicateMatches.push(existingRows[0]);
        } else {
          sanitizedRecords.push(rec);
        }
      }

      let finalData = [];
      if (sanitizedRecords.length > 0) {
        const isInsert = sanitizedRecords.every(r => r.id === undefined || r.id === null);
        const query = isInsert ? client.from(table).insert(sanitizedRecords) : client.from(table).upsert(sanitizedRecords);
        const { data, error } = await query.select("*");
        if (error) {
          if (error.code === "23505") {
            const { data: allMatching } = await client
              .from("plan_participants")
              .select("*")
              .in("plan_id", records.map(r => r.plan_id).filter(Boolean))
              .in("user_id", records.map(r => r.user_id).filter(Boolean));
            res.json({ success: true, count: allMatching?.length || 0, data: allMatching || [] });
            return;
          }
          console.error(`[Supabase DB Operation Sync] Error writing to ${table}:`, error);
          res.status(500).json({ error: error.message, details: error.details, hint: error.hint });
          return;
        }
        finalData = data || [];
      }

      const combinedData = [...finalData, ...duplicateMatches];
      res.json({ success: true, count: combinedData.length, data: combinedData });
      return;
    }

    // Guard: Prevent duplicate circle_memberships
    if (table === "circle_members") {
      const sanitizedRecords = [];
      const duplicateMatches = [];

      for (const rec of records) {
        if (!rec.circle_id || !rec.user_id) {
          sanitizedRecords.push(rec);
          continue;
        }

        const { data: existingRows } = await client
          .from("circle_members")
          .select("*")
          .eq("circle_id", rec.circle_id)
          .eq("user_id", rec.user_id);

        if (existingRows && existingRows.length > 0) {
          duplicateMatches.push(existingRows[0]);
        } else {
          sanitizedRecords.push(rec);
        }
      }

      let finalData = [];
      if (sanitizedRecords.length > 0) {
        const isInsert = sanitizedRecords.every(r => r.id === undefined || r.id === null);
        const query = isInsert ? client.from(table).insert(sanitizedRecords) : client.from(table).upsert(sanitizedRecords);
        const { data, error } = await query.select("*");
        if (error) {
          if (error.code === "23505") {
            const { data: allMatching } = await client
              .from("circle_members")
              .select("*")
              .in("circle_id", records.map(r => r.circle_id).filter(Boolean))
              .in("user_id", records.map(r => r.user_id).filter(Boolean));
            res.json({ success: true, count: allMatching?.length || 0, data: allMatching || [] });
            return;
          }
          console.error(`[Supabase DB Operation Sync] Error writing to ${table}:`, error);
          res.status(500).json({ error: error.message, details: error.details, hint: error.hint });
          return;
        }
        finalData = data || [];
      }

      const combinedData = [...finalData, ...duplicateMatches];
      res.json({ success: true, count: combinedData.length, data: combinedData });
      return;
    }

    console.log(`[Supabase DB Write] Table: ${table}, Payload before write:`, records);

    const isInsert = records.every(r => r.id === undefined || r.id === null) && table !== "user_stats" && table !== "user_data";
    
    let data, error;
    if (isInsert) {
      const { data: resData, error: resErr } = await client.from(table).insert(records).select("*");
      data = resData;
      error = resErr;
    } else {
      const updatedRows = [];
      for (const rec of records) {
        if (rec.id) {
          const { data: resData, error: resErr } = await client
            .from(table)
            .update(rec)
            .eq("id", rec.id)
            .select("*");
          if (resErr) {
            error = resErr;
            break;
          }
          if (resData) updatedRows.push(...resData);
        } else {
          const { data: resData, error: resErr } = await client
            .from(table)
            .upsert([rec])
            .select("*");
          if (resErr) {
            error = resErr;
            break;
          }
          if (resData) updatedRows.push(...resData);
        }
      }
      data = updatedRows;
    }

    if (error) {
      console.error(`[Supabase DB Operation Sync] Error writing to ${table}:`, error);
      res.status(500).json({ error: error.message, details: error.details, hint: error.hint });
      return;
    }

    console.log(`[Supabase DB Write Success] Table: ${table}, Saved:`, data);
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

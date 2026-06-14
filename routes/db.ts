import { Router } from "express";
import { getSupabaseClient } from "../server";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

router.get("/fetch-all", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const client = getSupabaseClient();
    if (!client) {
      res.json({
        configured: false,
        tables_missing: true,
        missing_tables: ["users", "circles", "circle_members", "plans", "plan_participants", "transactions", "memories", "memory_attendees", "memory_movie_verdicts", "memory_restaurant_votes", "memory_match_results", "memory_mvp_votes", "friendships"],
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
      "memory_attendees",
      "memory_movie_verdicts",
      "memory_restaurant_votes",
      "memory_match_results",
      "memory_mvp_votes",
      "user_stats",
      "notifications",
      "user_data",
      "plan_reminders",
      "friendships",
      "plan_team_assignments"
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

// GET /api/db/team-assignments?plan_id=<uuid>
// Returns all team assignments for the given plan.
router.get("/team-assignments", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const planId = req.query.plan_id as string | undefined;
    if (!planId) {
      res.status(400).json({ error: "Missing plan_id query parameter." });
      return;
    }
    const client = getSupabaseClient();
    if (!client) {
      res.status(503).json({ error: "Supabase client not initialized." });
      return;
    }
    const { data, error } = await client
      .from("plan_team_assignments")
      .select("*")
      .eq("plan_id", planId);
    if (error) {
      console.error("[DB] team-assignments fetch error:", error);
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ success: true, count: data?.length || 0, data: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Internal error" });
  }
});

// GET /api/chat/messages
// Fetches circle messages or plan thread messages with authorization guards
router.get("/chat/messages", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { circle_id, plan_id, parent_id } = req.query as Record<string, string | undefined>;
    const userId = req.user!.id;

    const client = getSupabaseClient();
    if (!client) {
      res.status(503).json({ error: "Supabase client not initialized." });
      return;
    }

    // 1. If fetching plan thread messages
    if (plan_id) {
      if (!isUuid(plan_id)) {
        res.status(400).json({ error: "Invalid plan_id UUID format." });
        return;
      }

      // Check plan participation/host authorization
      const { data: plan } = await client.from("plans").select("host_id, circle_id").eq("id", plan_id).single();
      if (!plan) {
        res.status(404).json({ error: "Plan not found." });
        return;
      }

      const isHost = plan.host_id === userId;
      let isParticipant = false;

      if (!isHost) {
        const { data: participation } = await client
          .from("plan_participants")
          .select("status")
          .eq("plan_id", plan_id)
          .eq("user_id", userId)
          .single();

        if (participation && ["going", "accepted", "waitlist", "host"].includes(participation.status)) {
          isParticipant = true;
        }
      }

      if (!isHost && !isParticipant) {
        res.status(403).json({ error: "Access denied. You are not a participant of this plan." });
        return;
      }

      // Fetch the last 50 messages of the plan thread (newest first for limit, client reverses)
      const { data: messages, error } = await client
        .from("circle_messages")
        .select("*, sender:users!circle_messages_sender_id_fkey(id, username, full_name, profile_photo), systemActor:users!circle_messages_system_actor_id_fkey(id, username, full_name, profile_photo)")
        .eq("plan_id", plan_id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      res.json({ success: true, count: messages?.length || 0, data: messages || [] });
      return;
    }

    // 2. If fetching general circle messages (no plan_id)
    if (circle_id) {
      if (!isUuid(circle_id)) {
        res.status(400).json({ error: "Invalid circle_id UUID format." });
        return;
      }

      // Verify circle membership
      const { data: member } = await client
        .from("circle_members")
        .select("id")
        .eq("circle_id", circle_id)
        .eq("user_id", userId)
        .single();

      if (!member) {
        res.status(403).json({ error: "Access denied. You are not a member of this circle." });
        return;
      }

      let query = client
        .from("circle_messages")
        .select("*, sender:users!circle_messages_sender_id_fkey(id, username, full_name, profile_photo), systemActor:users!circle_messages_system_actor_id_fkey(id, username, full_name, profile_photo)")
        .eq("circle_id", circle_id);

      if (parent_id) {
        query = query.eq("parent_id", parent_id);
      } else {
        query = query.is("parent_id", null); // Root general chat
      }

      const { data: messages, error } = await query
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      res.json({ success: true, count: messages?.length || 0, data: messages || [] });
      return;
    }

    res.status(400).json({ error: "Specify circle_id or plan_id." });
  } catch (err: any) {
    console.error("[GET /api/chat/messages] Fetch error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch chat messages." });
  }
});


router.post("/upsert", authMiddleware, async (req: AuthenticatedRequest, res) => {
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

    // Phase 9A High-Risk Checks
    if (table === "plans") {
      for (const rec of records) {
        if (rec.id) {
          const { data: currentPlan } = await client
            .from("plans")
            .select("host_id, created_by")
            .eq("id", rec.id)
            .single();

          if (currentPlan) {
            const currentHost = currentPlan.host_id || currentPlan.created_by;
            if (currentHost !== req.user!.id) {
              res.status(403).json({ error: "Forbidden. Only the host can modify this plan." });
              return;
            }
          }
        }
      }
    }

    if (table === "circle_members") {
      for (const rec of records) {
        if (rec.id && rec.role === "co_host") {
          const { data: currentMember } = await client
            .from("circle_members")
            .select("circle_id")
            .eq("id", rec.id)
            .single();

          if (currentMember) {
            const { data: circle } = await client
              .from("circles")
              .select("created_by")
              .eq("id", currentMember.circle_id)
              .single();

            if (circle && circle.created_by !== req.user!.id) {
              res.status(403).json({ error: "Forbidden. Only the Circle Host can promote co-hosts." });
              return;
            }
          }
        }
      }
    }

    // Guard: circle_messages validation (membership & waitlist checks)
    if (table === "circle_messages") {
      for (const rec of records) {
        // Enforce Phase 9A Chat Security
        rec.sender_id = req.user!.id;
        rec.message_type = "user";
        rec.system_actor_id = null;

        if (!rec.circle_id) {
          res.status(400).json({ error: "Missing circle_id for message." });
          return;
        }

        // Verify circle membership
        const { data: member } = await client
          .from("circle_members")
          .select("id")
          .eq("circle_id", rec.circle_id)
          .eq("user_id", rec.sender_id)
          .single();

        if (!member) {
          res.status(403).json({ error: "Sender is not a member of the circle." });
          return;
        }

        // If posting to a plan thread (plan_id is set)
        if (rec.plan_id) {
          // Check plan host status
          const { data: plan } = await client
            .from("plans")
            .select("host_id")
            .eq("id", rec.plan_id)
            .single();

          if (!plan) {
            res.status(404).json({ error: "Associated plan not found." });
            return;
          }

          const isHost = plan.host_id === rec.sender_id;
          let isAuthorizedParticipant = false;

          if (!isHost) {
            const { data: participation } = await client
              .from("plan_participants")
              .select("status")
              .eq("plan_id", rec.plan_id)
              .eq("user_id", rec.sender_id)
              .single();

            // Waitlisted users are blocked from sending (read-only)
            if (participation && ["going", "accepted"].includes(participation.status)) {
              isAuthorizedParticipant = true;
            }
          }

          if (!isHost && !isAuthorizedParticipant) {
            res.status(403).json({ error: "Access denied. Waitlisted or non-participants cannot write to plan threads." });
            return;
          }
        }
      }
    }

    // plan_team_assignments: upsert on (plan_id, user_id) conflict
    // This allows moving a player between Team A and Team B.
    if (table === "plan_team_assignments") {
      const { data, error } = await client
        .from("plan_team_assignments")
        .upsert(records, { onConflict: "plan_id,user_id" })
        .select("*");
      if (error) {
        console.error(`[Supabase DB] Error writing to plan_team_assignments:`, error);
        res.status(500).json({ error: error.message, details: error.details });
        return;
      }
      res.json({ success: true, count: data?.length || 0, data: data || [] });
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

        const exists = existingRows && existingRows.length > 0;
        if (exists) {
          const isLegitimateUpdate = rec.id && rec.id === existingRows[0].id;
          if (isLegitimateUpdate) {
            sanitizedRecords.push(rec);
          } else {
            duplicateMatches.push(existingRows[0]);
          }
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

    // Per-table write strategy.
    // memories / memory_attendees / memory_ratings use upsert with onConflict so that
    // retrying completePlan (or a double-click) never causes a 23505 unique violation.
    // These tables receive client-generated UUIDs in the `id` field, which would
    // otherwise route them into the UPDATE path — silently writing 0 rows since
    // the row doesn't exist yet.
    let data, error;

    if (table === "memories") {
      const results: any[] = [];
      for (const rec of records) {
        if (rec.plan_id) {
          // Check if memory already exists for this plan_id
          const { data: existing } = await client
            .from("memories")
            .select("*")
            .eq("plan_id", rec.plan_id);
          
          if (existing && existing.length > 0) {
            // Keep the existing database ID to preserve foreign key references
            const updatePayload = { ...rec, id: existing[0].id };
            const { data: d, error: e } = await client
              .from("memories")
              .update(updatePayload)
              .eq("id", existing[0].id)
              .select("*");
            if (e) { error = e; break; }
            if (d) results.push(...d);
          } else {
            // Insert new memory row
            const { data: d, error: e } = await client
              .from("memories")
              .insert([rec])
              .select("*");
            if (e) { error = e; break; }
            if (d) results.push(...d);
          }
        } else if (rec.id) {
          // Update by id (e.g. host saving football/badminton score)
          const { data: d, error: e } = await client
            .from("memories")
            .update(rec)
            .eq("id", rec.id)
            .select("*");
          if (e) { error = e; break; }
          if (d) results.push(...d);
        }
      }
      data = results;
    } else if (table === "memory_attendees") {
      // (memory_id, user_id) is UNIQUE
      const { data: d, error: e } = await client
        .from("memory_attendees")
        .upsert(records, { onConflict: "memory_id,user_id" })
        .select("*");
      data = d;
      error = e;
    } else if (table === "memory_movie_verdicts") {
      // (memory_id, user_id) is UNIQUE
      const { data: d, error: e } = await client
        .from("memory_movie_verdicts")
        .upsert(records, { onConflict: "memory_id,user_id" })
        .select("*");
      data = d;
      error = e;
    } else if (table === "memory_restaurant_votes") {
      // (memory_id, user_id) is UNIQUE
      const { data: d, error: e } = await client
        .from("memory_restaurant_votes")
        .upsert(records, { onConflict: "memory_id,user_id" })
        .select("*");
      data = d;
      error = e;
    } else if (table === "memory_match_results") {
      // memory_id is UNIQUE (one match result per memory)
      const { data: d, error: e } = await client
        .from("memory_match_results")
        .upsert(records, { onConflict: "memory_id" })
        .select("*");
      data = d;
      error = e;
    } else if (table === "memory_mvp_votes") {
      // (memory_id, voter_user_id) is UNIQUE
      const { data: d, error: e } = await client
        .from("memory_mvp_votes")
        .upsert(records, { onConflict: "memory_id,voter_user_id" })
        .select("*");
      data = d;
      error = e;
    } else {
      const isInsert = records.every((r: any) => r.id === undefined || r.id === null) &&
        table !== "user_stats" &&
        table !== "user_data";

      if (isInsert) {
        const { data: resData, error: resErr } = await client.from(table).insert(records).select("*");
        data = resData;
        error = resErr;
      } else {
        const updatedRows: any[] = [];
        for (const rec of records) {
          if (rec.id) {
            const { data: resData, error: resErr } = await client
              .from(table)
              .update(rec)
              .eq("id", rec.id)
              .select("*");
            if (resErr) { error = resErr; break; }
            if (resData) updatedRows.push(...resData);
          } else {
            const { data: resData, error: resErr } = await client
              .from(table)
              .upsert([rec])
              .select("*");
            if (resErr) { error = resErr; break; }
            if (resData) updatedRows.push(...resData);
          }
        }
        data = updatedRows;
      }
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

router.post("/delete", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { table, match } = req.body;
    console.log("[TRACE /api/db/delete] Incoming body:", JSON.stringify(req.body, null, 2));

    if (!table || !match || typeof match !== "object") {
      res.status(400).json({ error: "Invalid payload parameters. Expected 'table' name and 'match' object." });
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      res.status(503).json({ error: "Supabase client key or endpoint is not initialized." });
      return;
    }

    // Phase 9A Delete Security Checks
    if (table === "plan_participants") {
      const planId = match.plan_id;
      if (!planId) {
        res.status(400).json({ error: "Missing plan_id in deletion match criteria." });
        return;
      }
      
      const { data: plan } = await client
        .from("plans")
        .select("host_id, created_by")
        .eq("id", planId)
        .single();

      if (!plan) {
        res.status(404).json({ error: "Plan not found." });
        return;
      }

      const planHost = plan.host_id || plan.created_by;
      if (planHost !== req.user!.id) {
        res.status(403).json({ error: "Forbidden. Only the host can remove participants." });
        return;
      }
    }

    if (table === "circles") {
      const circleId = match.id || match.circle_id;
      if (!circleId) {
        res.status(400).json({ error: "Missing circle ID in deletion match criteria." });
        return;
      }

      const { data: circle } = await client
        .from("circles")
        .select("created_by")
        .eq("id", circleId)
        .single();

      if (!circle) {
        res.status(404).json({ error: "Circle not found." });
        return;
      }

      if (circle.created_by !== req.user!.id) {
        res.status(403).json({ error: "Forbidden. Only the Circle Host can delete this circle." });
        return;
      }
    }

    if (table === "circle_members") {
      const circleId = match.circle_id;
      const targetUserId = match.user_id;

      if (!circleId || !targetUserId) {
        res.status(400).json({ error: "Missing circle_id or user_id in deletion match criteria." });
        return;
      }

      // Allow self-removal (leaving circle)
      if (targetUserId !== req.user!.id) {
        const { data: actorMember } = await client
          .from("circle_members")
          .select("role")
          .eq("circle_id", circleId)
          .eq("user_id", req.user!.id)
          .single();

        if (!actorMember || (actorMember.role !== "host" && actorMember.role !== "co_host")) {
          res.status(403).json({ error: "Forbidden. Only Hosts or Co-hosts can remove members." });
          return;
        }

        const { data: targetMember } = await client
          .from("circle_members")
          .select("role")
          .eq("circle_id", circleId)
          .eq("user_id", targetUserId)
          .single();

        if (targetMember) {
          if (targetMember.role === "host") {
            res.status(403).json({ error: "Forbidden. Circle Host cannot be removed." });
            return;
          }
          if (actorMember.role === "co_host" && targetMember.role === "co_host") {
            res.status(403).json({ error: "Forbidden. Co-hosts cannot remove other Co-hosts." });
            return;
          }
        }
      }
    }

    console.log(`[TRACE /api/db/delete] table="${table}"  match=${JSON.stringify(match)}`);

    let query = client.from(table).delete();
    for (const [key, val] of Object.entries(match)) {
      console.log(`[TRACE /api/db/delete]   .eq("${key}", "${val}")`);
      query = query.eq(key, val);
    }

    const { data, error } = await query.select("*");

    console.log(`[TRACE /api/db/delete] Supabase error  :`, JSON.stringify(error, null, 2));
    console.log(`[TRACE /api/db/delete] Supabase data   :`, JSON.stringify(data, null, 2));

    if (error) {
      console.error(`[TRACE /api/db/delete] *** SUPABASE ERROR for table="${table}" ***`);
      console.error(`  error.message : ${error.message}`);
      console.error(`  error.details : ${(error as any).details}`);
      console.error(`  error.hint    : ${(error as any).hint}`);
      console.error(`  error.code    : ${(error as any).code}`);
      console.error(`[Supabase DB Operation Sync] Error deleting from ${table}:`, error);
      res.status(500).json({ error: error.message, details: (error as any).details, hint: (error as any).hint });
      return;
    }

    console.log(`[TRACE /api/db/delete] SUCCESS — rows deleted: ${data?.length ?? 0}`);
    res.json({ success: true, count: data?.length || 0, data });
  } catch (error: any) {
    console.error("[Supabase Sync Proxy Error]:", error);
    res.status(500).json({ error: error.message || "Internal server error deleting database changes." });
  }
});


router.post("/reset", async (req, res) => {
  try {
    if (process.env.NODE_ENV !== "development") {
      res.status(403).json({ error: "Development only" });
      return;
    }
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
    if (process.env.NODE_ENV !== "development") {
      res.status(403).json({ error: "Development only" });
      return;
    }
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

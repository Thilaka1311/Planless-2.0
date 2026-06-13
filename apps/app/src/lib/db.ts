/**
 * db.ts — Planless Database Service Layer
 *
 * Single source of truth for all Supabase operations.
 * All records use the UUID `id` column as the primary key.
 * No debounce effects. Write-on-action only.
 */

// ─────────────────────────────────────────────
// RAW DATABASE ROW TYPES  (mirror Supabase schema exactly)
// ─────────────────────────────────────────────

export interface DbUser {
  id: string;           // UUID primary key
  user_id: string;      // sequential public ID e.g. "U001"
  full_name: string;
  username: string;
  phone_number: string;
  profile_photo: string;
  bio: string;
  college_or_work: string;
  wallet_balance: number;
  active_status: boolean;
  created_at: string;
}

export interface DbPlan {
  id: string;           // UUID primary key
  plan_id: string;      // sequential public ID e.g. "P001"
  title: string;
  description: string;
  created_by: string;   // UUID → users.id
  host_id?: string;      // UUID → users.id (mutable host reference)
  circle_id: string | null; // UUID → circles.id
  activity_type: string | null; // "football" | "badminton" | null
  category: string;     // "sports" | "movies" | "dining" | "custom"
  location: string;
  datetime: string;     // ISO timestamp
  max_people: number;
  split_amount: number;
  payment_required: boolean;
  status: "active" | "completed" | "cancelled";
  created_at: string;
  cover_image: string | null;
  notes: string | null;
}

export interface DbParticipant {
  id: string;            // UUID primary key
  participant_id: string; // sequential public ID e.g. "PP001"
  plan_id: string;       // UUID → plans.id
  user_id: string;       // UUID → users.id
  status: "going" | "delivered" | "waitlist" | "passed" | "host" | "accepted" | "declined" | "seen" | "skipped" | string;
  payment_status: "paid" | "unpaid";
  joined_at: string;
  waitlisted_at?: string | null;
}

export interface DbFriendship {
  id?: string;
  sender_id: string;
  receiver_id: string;
  created_at?: string;
}

export interface DbCircle {
  id: string;           // UUID primary key
  circle_id: string;    // text public ID
  name: string;
  description: string;
  category: string;
  created_by: string;   // UUID -> users.id
  cover_image: string;
  location_anchor: string;
  privacy: "public" | "private";
  created_at: string;
}

export interface DbCircleMember {
  id: string;           // UUID primary key
  circle_id: string;    // UUID -> circles.id
  user_id: string;      // UUID -> users.id
  role: "host" | "co_host" | "member";
  joined_at: string;
}

export interface DbUserStats {
  user_id: string;      // UUID -> users.id (primary key)
  plans_created: number;
  plans_joined: number;
  circles_joined: number;
  memories_uploaded: number;
}

export interface DbMemory {
  id: string;
  plan_id: string;
  memory_type: string;
  status: string;
  created_at: string;
  locked_at: string | null;
  editable_until: string;
}

export interface DbMemoryAttendee {
  id: string;
  memory_id: string;
  user_id: string;
  created_at: string;
}

export interface DbMemoryMovieVerdict {
  id: string;
  memory_id: string;
  user_id: string;
  verdict: "loved_it" | "good" | "not_for_me";
  created_at: string;
}

export interface DbMemoryRestaurantVote {
  id: string;
  memory_id: string;
  user_id: string;
  vote: "yes" | "maybe" | "no";
  created_at: string;
}

export interface DbMemoryMatchResult {
  id: string;
  memory_id: string;
  team_a_score: number;
  team_b_score: number;
  recorded_by: string;
  created_at: string;
}

export interface DbMemoryMvpVote {
  id: string;
  memory_id: string;
  voter_user_id: string;
  mvp_user_id: string;
  created_at: string;
}

export interface DbMemoryBadmintonResult {
  id: string;
  memory_id: string;
  user_id: string;
  wins: number;
  losses: number;
  created_at: string;
  updated_at: string;
}

export interface DbFriendship {
  id?: string;
  sender_id: string;
  receiver_id: string;
  created_at?: string;
}

export interface DbCircleMessage {
  id: string;
  circle_id: string;
  sender_id: string | null;
  system_actor_id: string | null;
  parent_id: string | null;
  plan_id: string | null;
  content: string;
  message_type: "user" | "system";
  created_at: string;
  edited_at: string | null;
}

export interface DbTransaction {
  id: string;
  transaction_id: string;
  sender_id: string | null;
  receiver_id: string | null;
  plan_id: string | null;
  amount: number;
  transaction_type: string;
  status: string;
  created_at: string;
}

// ─────────────────────────────────────────────
// SNAPSHOT — what we load from Supabase on boot / poll
// ─────────────────────────────────────────────

export interface DbSnapshot {
  users: DbUser[];
  plans: DbPlan[];
  participants: DbParticipant[];
  circles: DbCircle[];
  circleMembers: DbCircleMember[];
  userStats: DbUserStats[];
  memories: DbMemory[];
  memoryAttendees: DbMemoryAttendee[];
  memoryMovieVerdicts: DbMemoryMovieVerdict[];
  memoryRestaurantVotes: DbMemoryRestaurantVote[];
  memoryMatchResults: DbMemoryMatchResult[];
  memoryMvpVotes: DbMemoryMvpVote[];
  memoryBadmintonResults: DbMemoryBadmintonResult[];
  transactions: DbTransaction[];
  notifications: any[];
  userData: any[];
  planReminders: any[];
  friendships: DbFriendship[];
  planTeamAssignments?: DbPlanTeamAssignment[];
}

// ─────────────────────────────────────────────
// FETCH  — load everything the current user needs
// ─────────────────────────────────────────────

export async function fetchSnapshot(): Promise<DbSnapshot | null> {
  try {
    const res = await fetch("/api/db/fetch-all");
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.configured || json.tables_missing) return null;
    const rawPlans = json.data?.plans || [];
    const rawParticipants = json.data?.plan_participants || [];
    const uuids = rawPlans.map((p: any) => p.id);
    const uniqueUuids = [...new Set(uuids)];
    const duplicates = uuids.filter((item: any, index: number) => uuids.indexOf(item) !== index);
    console.log(`[DbSnapshot Audit] Raw plans count: ${rawPlans.length}, participants: ${rawParticipants.length}, unique UUIDs: ${uniqueUuids.length}`);
    if (duplicates.length > 0) {
      console.error(`[DbSnapshot Audit] Duplicate plan UUIDs:`, duplicates);
    }

    return {
      users:                 (json.data?.users             || []) as DbUser[],
      plans:                 rawPlans as DbPlan[],
      participants:          rawParticipants as DbParticipant[],
      circles:               (json.data?.circles           || []) as DbCircle[],
      circleMembers:         (json.data?.circle_members     || []) as DbCircleMember[],
      userStats:             (json.data?.user_stats        || []) as DbUserStats[],
      memories:              (json.data?.memories          || []) as DbMemory[],
      memoryAttendees:       (json.data?.memory_attendees  || []) as DbMemoryAttendee[],
      memoryMovieVerdicts:   (json.data?.memory_movie_verdicts || []) as DbMemoryMovieVerdict[],
      memoryRestaurantVotes: (json.data?.memory_restaurant_votes || []) as DbMemoryRestaurantVote[],
      memoryMatchResults:    (json.data?.memory_match_results || []) as DbMemoryMatchResult[],
      memoryMvpVotes:        (json.data?.memory_mvp_votes   || []) as DbMemoryMvpVote[],
      memoryBadmintonResults:(json.data?.memory_badminton_results || []) as DbMemoryBadmintonResult[],
      transactions:          (json.data?.transactions      || []) as DbTransaction[],
      notifications:         (json.data?.notifications     || []) as any[],
      userData:              (json.data?.user_data         || []) as any[],
      planReminders:         (json.data?.plan_reminders    || []) as any[],
      friendships:           (json.data?.friendships       || []) as DbFriendship[],
      planTeamAssignments:   (json.data?.plan_team_assignments || []) as DbPlanTeamAssignment[],
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// WRITE — individual targeted writes (called on user action only)
// ─────────────────────────────────────────────

async function upsert(table: string, records: any[]): Promise<any[] | null> {
  try {
    const res = await fetch("/api/db/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table, records }),
    });
    if (!res.ok) {
      const err = await res.json();
      console.error(`[DB] upsert ${table} failed:`, err);
      return null;
    }
    const result = await res.json();
    return result.data ?? null;
  } catch (e) {
    console.error(`[DB] upsert ${table} exception:`, e);
    return null;
  }
}

/** Update an existing user profile row. */
export async function updateDbUser(user: Partial<DbUser> & { id: string }): Promise<DbUser | null> {
  const rows = await upsert("users", [user]);
  return rows?.[0] ?? null;
}

/** Insert a brand-new plan row. Returns the DB-generated row (with real plan_id). */
export async function insertPlan(plan: Omit<DbPlan, "id" | "plan_id">): Promise<DbPlan | null> {
  const rows = await upsert("plans", [plan]);
  return rows?.[0] ?? null;
}

/** Insert a new participant row. Returns the DB-generated row (with real participant_id). */
export async function insertParticipant(
  p: Omit<DbParticipant, "id" | "participant_id">
): Promise<DbParticipant | null> {
  if (!p.plan_id || !p.user_id) {
    console.warn("[DB] insertParticipant: missing plan_id or user_id.");
    return null;
  }
  const rows = await upsert("plan_participants", [p]);
  return rows?.[0] ?? null;
}

/** Update an existing participant's status (accept / leave / waitlist). */
export async function updateParticipantStatus(
  participantId: string,   // UUID primary key
  status: DbParticipant["status"],
  paymentStatus?: DbParticipant["payment_status"],
  joinedAt?: string,
  waitlistedAt?: string | null
): Promise<DbParticipant | null> {
  if (!participantId) {
    console.warn("[DB] updateParticipantStatus: missing participantId.");
    return null;
  }
  const update: any = { id: participantId, status };
  if (paymentStatus !== undefined) update.payment_status = paymentStatus;
  if (joinedAt !== undefined) update.joined_at = joinedAt;
  if (waitlistedAt !== undefined) update.waitlisted_at = waitlistedAt;
  const rows = await upsert("plan_participants", [update]);
  return rows?.[0] ?? null;
}

/** Insert multiple participants at once (bulk invite). */
export async function insertParticipants(
  rows: Omit<DbParticipant, "id" | "participant_id">[]
): Promise<DbParticipant[]> {
  if (rows.length === 0) return [];
  
  // Guard: filter out duplicates within the input array
  const uniqueRows: typeof rows = [];
  const seenKeys = new Set<string>();
  for (const row of rows) {
    if (!row.plan_id || !row.user_id) continue;
    const key = `${row.plan_id}_${row.user_id}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueRows.push(row);
    }
  }

  if (uniqueRows.length === 0) return [];
  const result = await upsert("plan_participants", uniqueRows);
  return result ?? [];
}

/** Insert a brand-new circle. */
export async function insertCircle(circle: Omit<DbCircle, "id">): Promise<DbCircle | null> {
  const rows = await upsert("circles", [circle]);
  return rows?.[0] ?? null;
}

async function generateCircleFriendships(insertedMembers: DbCircleMember[]): Promise<void> {
  try {
    if (insertedMembers.length === 0) return;
    
    // Get unique circle IDs from the inserted members
    const circleIds = [...new Set(insertedMembers.map(m => m.circle_id))];
    if (circleIds.length === 0) return;

    // Fetch latest snapshot to get all current circle members and existing friendships
    const freshRes = await fetch("/api/db/fetch-all");
    if (!freshRes.ok) return;
    const json = await freshRes.json();
    const allMembers: DbCircleMember[] = json.data?.circle_members || [];
    const existingFriendships: any[] = json.data?.friendships || [];

    // Filter to find all members of the circles we care about
    const circleMembers = allMembers.filter(m => circleIds.includes(m.circle_id));

    // Group members by circle_id
    const membersByCircle: Record<string, string[]> = {};
    circleMembers.forEach(m => {
      if (m.circle_id && m.user_id) {
        if (!membersByCircle[m.circle_id]) {
          membersByCircle[m.circle_id] = [];
        }
        membersByCircle[m.circle_id].push(m.user_id);
      }
    });

    // Generate unique symmetric friendship pairs (min_id, max_id)
    const newFriendshipsMap = new Map<string, { sender_id: string; receiver_id: string }>();

    Object.values(membersByCircle).forEach(userIds => {
      const uniqueUserIds = [...new Set(userIds)];
      for (let i = 0; i < uniqueUserIds.length; i++) {
        for (let j = i + 1; j < uniqueUserIds.length; j++) {
          const u1 = uniqueUserIds[i];
          const u2 = uniqueUserIds[j];
          if (u1 === u2) continue;
          const sender = u1 < u2 ? u1 : u2;
          const receiver = u1 < u2 ? u2 : u1;
          const key = `${sender}_${receiver}`;
          newFriendshipsMap.set(key, { sender_id: sender, receiver_id: receiver });
        }
      }
    });

    // Filter out friendships that already exist in database
    const friendshipsToInsert = Array.from(newFriendshipsMap.values()).filter(f => {
      return !existingFriendships.some(ef => ef.sender_id === f.sender_id && ef.receiver_id === f.receiver_id);
    });

    if (friendshipsToInsert.length > 0) {
      console.log(`[Friendships Auto-gen] Inserting ${friendshipsToInsert.length} new friendships:`, friendshipsToInsert);
      await upsert("friendships", friendshipsToInsert);
    }
  } catch (err) {
    console.error("[Friendships Auto-gen] Failed to generate circle friendships:", err);
  }
}

/** Insert circle members. */
export async function insertCircleMembers(members: Omit<DbCircleMember, "id">[]): Promise<DbCircleMember[]> {
  if (members.length === 0) return [];
  const result = await upsert("circle_members", members);
  if (result && result.length > 0) {
    await generateCircleFriendships(result);
  }
  return result ?? [];
}

/** Insert a plan reminder. */
export async function insertPlanReminder(reminder: { plan_id: string, sent_by: string }): Promise<any> {
  const result = await upsert("plan_reminders", [reminder]);
  return result?.[0] ?? null;
}

/** Insert a transaction. */
export async function insertTransaction(tx: Omit<DbTransaction, "id">): Promise<DbTransaction | null> {
  const result = await upsert("transactions", [tx]);
  return (result?.[0] as DbTransaction) ?? null;
}

/** Sync user stats: increments statistics counters */
export async function syncUserStats(
  userUuid: string,
  event: "create_plan" | "join_plan" | "create_circle" | "join_circle" | "upload_memory"
): Promise<any> {
  try {
    // 1. Fetch current user_stats row
    const res = await fetch("/api/db/fetch-all");
    if (!res.ok) return null;
    const json = await res.json();
    const statsList = (json.data?.user_stats || []) as DbUserStats[];
    let currentStats = statsList.find(s => s.user_id === userUuid);

    if (!currentStats) {
      // If it doesn't exist, initialize it
      currentStats = {
        user_id: userUuid,
        plans_created: 0,
        plans_joined: 0,
        circles_joined: 0,
        memories_uploaded: 0
      };
    }

    // 2. Increment the corresponding field
    const updatedStats = { ...currentStats };
    if (event === "create_plan") {
      updatedStats.plans_created = (updatedStats.plans_created || 0) + 1;
    } else if (event === "join_plan") {
      updatedStats.plans_joined = (updatedStats.plans_joined || 0) + 1;
    } else if (event === "create_circle" || event === "join_circle") {
      updatedStats.circles_joined = (updatedStats.circles_joined || 0) + 1;
    } else if (event === "upload_memory") {
      updatedStats.memories_uploaded = (updatedStats.memories_uploaded || 0) + 1;
    }

    // 3. Upsert back to Supabase
    const rows = await upsert("user_stats", [updatedStats]);
    return rows?.[0] ?? null;
  } catch (e) {
    console.error("[DB] syncUserStats exception:", e);
    return null;
  }
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/** Find a user by UUID in a snapshot. */
export function findUser(users: DbUser[], uuid: string): DbUser | undefined {
  return users.find(u => u.id === uuid);
}

/** Find all participants for a given plan UUID. */
export function participantsForPlan(participants: DbParticipant[], planId: string): DbParticipant[] {
  return participants.filter(p => p.plan_id === planId);
}

/** Find the participant row for a specific user on a specific plan. */
export function myParticipant(
  participants: DbParticipant[],
  planId: string,   // UUID
  userUuid: string  // UUID
): DbParticipant | undefined {
  return participants.find(p => p.plan_id === planId && p.user_id === userUuid);
}

// ─────────────────────────────────────────────
// PAYMENTS HELPERS
// ─────────────────────────────────────────────

export async function createRazorpayOrder(amount: number, receipt?: string, notes?: any): Promise<any> {
  try {
    const res = await fetch("/api/payments/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, receipt, notes }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[DB] createRazorpayOrder failed:", err);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error("[DB] createRazorpayOrder exception:", e);
    return null;
  }
}

export async function verifyRazorpayPayment(payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<any> {
  try {
    const res = await fetch("/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[DB] verifyRazorpayPayment failed:", err);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error("[DB] verifyRazorpayPayment exception:", e);
    return null;
  }
}

/** Delete a participant from a plan. */
export async function deleteParticipant(planUuid: string, userUuid: string): Promise<boolean> {
  const payload = {
    table: "plan_participants",
    match: { plan_id: planUuid, user_id: userUuid }
  };
  console.log("[TRACE deleteParticipant] Sending payload:", JSON.stringify(payload, null, 2));
  try {
    const res = await fetch("/api/db/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    console.log("[TRACE deleteParticipant] HTTP status:", res.status, "ok:", res.ok);
    let responseBody: any = null;
    try {
      responseBody = await res.clone().json();
    } catch {
      responseBody = await res.clone().text();
    }
    console.log("[TRACE deleteParticipant] Response body:", JSON.stringify(responseBody, null, 2));
    if (!res.ok) {
      console.error("[TRACE deleteParticipant] FAILED — error.message:", responseBody?.error);
      console.error("[TRACE deleteParticipant] FAILED — error.details:", responseBody?.details);
      console.error("[TRACE deleteParticipant] FAILED — error.hint:", responseBody?.hint);
    }
    return res.ok;
  } catch (e) {
    console.error("[DB] deleteParticipant exception:", e);
    return false;
  }
}

/** Delete a member from a circle. */
export async function deleteCircleMember(circleUuid: string, userUuid: string): Promise<boolean> {
  try {
    const res = await fetch("/api/db/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "circle_members",
        match: { circle_id: circleUuid, user_id: userUuid }
      })
    });
    return res.ok;
  } catch (e) {
    console.error("[DB] deleteCircleMember exception:", e);
    return false;
  }
}

// ─────────────────────────────────────────────
// PLAN TEAM ASSIGNMENTS  (Football Team Organizer)
// ─────────────────────────────────────────────

export interface DbPlanTeamAssignment {
  id?: string;
  plan_id: string;
  user_id: string;
  team: "A" | "B";
  created_at?: string;
}

/**
 * Fetch all team assignments for a given plan UUID.
 * Returns an empty array if none exist.
 */
export async function getPlanTeamAssignments(planUuid: string): Promise<DbPlanTeamAssignment[]> {
  try {
    const res = await fetch(`/api/db/team-assignments?plan_id=${encodeURIComponent(planUuid)}`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch (e) {
    console.error("[DB] getPlanTeamAssignments exception:", e);
    return [];
  }
}

/**
 * Assign or move a participant to a team (upsert on plan_id + user_id).
 * Returns true on success.
 */
export async function upsertPlanTeamAssignment(
  planUuid: string,
  userUuid: string,
  team: "A" | "B"
): Promise<boolean> {
  try {
    const res = await fetch("/api/db/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "plan_team_assignments",
        records: [{ plan_id: planUuid, user_id: userUuid, team }]
      })
    });
    return res.ok;
  } catch (e) {
    console.error("[DB] upsertPlanTeamAssignment exception:", e);
    return false;
  }
}

/**
 * Remove a participant's team assignment (move them back to Unassigned).
 * Returns true on success.
 */
export async function removePlanTeamAssignment(
  planUuid: string,
  userUuid: string
): Promise<boolean> {
  try {
    const res = await fetch("/api/db/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "plan_team_assignments",
        match: { plan_id: planUuid, user_id: userUuid }
      })
    });
    return res.ok;
  } catch (e) {
    console.error("[DB] removePlanTeamAssignment exception:", e);
    return false;
  }
}

/**
 * Remove all team assignments for a given plan UUID.
 * Returns true on success.
 */
export async function deleteAllPlanTeamAssignments(planUuid: string): Promise<boolean> {
  try {
    const res = await fetch("/api/db/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "plan_team_assignments",
        match: { plan_id: planUuid }
      })
    });
    return res.ok;
  } catch (e) {
    console.error("[DB] deleteAllPlanTeamAssignments exception:", e);
    return false;
  }
}

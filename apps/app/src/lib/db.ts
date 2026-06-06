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
  activity_type: string; // "movies" | "sports" | "restaurants" | "custom"
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
  role: "admin" | "member";
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
  memory_id: string;
  plan_id: string;
  uploaded_by: string;  // UUID -> users.id
  media_url: string;
  caption: string;
  created_at: string;
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
  transactions: DbTransaction[];
  notifications: any[];
  userData: any[];
  planReminders: any[];
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
      users:         (json.data?.users             || []) as DbUser[],
      plans:         rawPlans as DbPlan[],
      participants:  rawParticipants as DbParticipant[],
      circles:       (json.data?.circles           || []) as DbCircle[],
      circleMembers: (json.data?.circle_members     || []) as DbCircleMember[],
      userStats:     (json.data?.user_stats        || []) as DbUserStats[],
      memories:      (json.data?.memories          || []) as DbMemory[],
      transactions:  (json.data?.transactions      || []) as DbTransaction[],
      notifications: (json.data?.notifications     || []) as any[],
      userData:      (json.data?.user_data         || []) as any[],
      planReminders: (json.data?.plan_reminders    || []) as any[],
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
  paymentStatus?: DbParticipant["payment_status"]
): Promise<DbParticipant | null> {
  if (!participantId) {
    console.warn("[DB] updateParticipantStatus: missing participantId.");
    return null;
  }
  const update: any = { id: participantId, status };
  if (paymentStatus !== undefined) update.payment_status = paymentStatus;
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

/** Insert circle members. */
export async function insertCircleMembers(members: Omit<DbCircleMember, "id">[]): Promise<DbCircleMember[]> {
  if (members.length === 0) return [];
  const result = await upsert("circle_members", members);
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


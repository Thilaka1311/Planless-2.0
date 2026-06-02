import React, { useState, useRef, useCallback, useEffect } from "react";
import { UserProfile, Circle, NotificationItem, Transaction, DbCircle, DbCircleMember, DbPlan, DbPlanParticipant, DbTransaction, DbMemory } from "../types";
import { DbUser, DbSnapshot } from "../../lib/db";
import { mapPlansToLegacyPlans, mapCirclesToLegacyCircles, mapTransactionsToLegacy } from "../../lib/mappers";

export function useSupabaseSync(myUuid: string, userProfile: UserProfile, setPlans: any) {
  // ─── Raw DB state ─────────────────────────────────────────────────────────
  const [dbUsers,        setDbUsers]        = useState<DbUser[]>([]);
  const [dbPlans,        setDbPlans]        = useState<DbPlan[]>([]);
  const [dbParticipants, setDbParticipants] = useState<DbPlanParticipant[]>([]);

  // Keep these for legacy code that still uses them (circles, transactions, memories)
  const [dbCircles,       setDbCircles]      = useState<DbCircle[]>([]);
  const [dbCircleMembers, setDbCircleMembers]= useState<DbCircleMember[]>([]);
  const [dbTransactions,  setDbTransactions] = useState<DbTransaction[]>([]);
  const [dbMemories,      setDbMemories]     = useState<DbMemory[]>([]);

  // ─── UI state ─────────────────────────────────────────────────────────────
  const [circles,       setCircles]      = useState<Circle[]>([]);
  const [notifications, setNotifications]= useState<NotificationItem[]>([]);
  const [transactions,  setTransactions] = useState<Transaction[]>([]);
  const [walletBalance, setWalletBalance]= useState(0);

  // ─── Supabase connection status ───────────────────────────────────────────
  const [supabaseConfig, setSupabaseConfig] = useState<{
    configured: boolean; tables_missing: boolean; missing_tables: string[]; supabase_url?: string;
  }>({ configured: false, tables_missing: true, missing_tables: [] });
  
  const [supabaseSyncStatus, setSupabaseSyncStatus] = useState<
    "loading" | "connected" | "schema_missing" | "unconfigured" | "error"
  >("loading");

  // Snapshot fingerprint — used by poll to skip unnecessary re-renders
  const lastSnapshotRef = useRef<string>("");
  const isLoadedRef = useRef(false);

  // ─── Helper: apply a fresh DB snapshot to local state ─────────────────────
  const applySnapshot = useCallback((snap: DbSnapshot) => {
    setDbUsers(snap.users);
    setDbPlans(snap.plans as any);
    setDbParticipants(snap.participants as any);

    // Map to UI Plan models using the clean mapper
    const uiPlans = mapPlansToLegacyPlans(snap.plans as any, snap.participants as any, snap.users, myUuid, snap.circles as any);
    setPlans(uiPlans);

    // Wallet balance for current user
    const me = snap.users.find((u: DbUser) => u.id === myUuid);
    if (me) setWalletBalance(Number(me.wallet_balance) || 0);

    // Notifications: any plan where I am "delivered" (invited) that I haven't seen yet
    setNotifications(prev => {
      const existingIds = new Set(prev.map(n => n.id));
      const newNotifs: NotificationItem[] = [];
      snap.participants.forEach((pp: any) => {
        if (pp.user_id !== myUuid || pp.status !== "delivered") return;
        const notifId = `invite_${pp.plan_id}`;
        if (existingIds.has(notifId)) return;
        const plan = snap.plans.find((p: any) => p.id === pp.plan_id);
        if (!plan) return;
        const creator = snap.users.find((u: DbUser) => u.id === plan.created_by);
        newNotifs.push({
          id:           notifId,
          type:         "invitation",
          title:        `${creator?.full_name ?? "Someone"} invited you to "${plan.title}"`,
          relativeTime: "just now",
          actionText:   "Accept & Join",
          planId:       plan.plan_id, // public ID used by UI for lookup
          cost:         Number(plan.split_amount ?? 0),
          creatorId:    plan.created_by,
        });
      });
      if (newNotifs.length === 0) return prev;
      return [...newNotifs, ...prev];
    });
  }, [myUuid, setPlans]);

  // ─── Initial boot load ────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;

    async function boot() {
      if (!myUuid) {
        setSupabaseSyncStatus("loading");
        return;
      }

      try {
        setSupabaseSyncStatus("loading");
        const res = await fetch("/api/db/fetch-all");
        if (!res.ok) throw new Error("fetch-all offline");
        const json = await res.json();
        if (!active) return;

        if (!json.configured) { setSupabaseSyncStatus("unconfigured"); return; }

        setSupabaseConfig({
          configured:     json.configured,
          tables_missing: json.tables_missing,
          missing_tables: json.missing_tables || [],
          supabase_url:   json.supabase_url || "",
        });

        if (json.tables_missing) { setSupabaseSyncStatus("schema_missing"); return; }

        const d = json.data || {};
        const snap: DbSnapshot = {
          users:         d.users             || [],
          plans:         d.plans             || [],
          participants:  d.plan_participants || [],
          circles:       d.circles           || [],
          circleMembers: d.circle_members    || [],
          userStats:     d.user_stats        || [],
          memories:      d.memories          || [],
          transactions:  d.transactions      || [],
          notifications: d.notifications     || [],
          userData:      d.user_data         || [],
          planReminders: d.plan_reminders    || [],
        };

        lastSnapshotRef.current = JSON.stringify({ p: snap.plans.length, pp: snap.participants.length });

        applySnapshot(snap);

        setDbCircles(d.circles || []);
        setDbCircleMembers(d.circle_members || []);
        setDbTransactions(d.transactions || []);
        setDbMemories(d.memories || []);
        setCircles(mapCirclesToLegacyCircles(d.circles || [], d.circle_members || [], d.users || []));
        setTransactions(mapTransactionsToLegacy(d.transactions || [], d.users || [], myUuid));

        setTimeout(() => {
          if (active) {
            isLoadedRef.current = true;
            setSupabaseSyncStatus("connected");
          }
        }, 800);

      } catch (err) {
        console.error("[DB Boot] failed:", err);
        if (active) setSupabaseSyncStatus("error");
      }
    }

    boot();
    return () => { active = false; };
  }, [myUuid, applySnapshot]);

  // ─── Live poll: every 6 s, refresh plans + participants ──────────────────
  useEffect(() => {
    if (supabaseSyncStatus !== "connected" || !myUuid) return;

    const poll = async () => {
      try {
        const res = await fetch("/api/db/fetch-all");
        if (!res.ok) return;
        const json = await res.json();
        if (!json.configured || json.tables_missing) return;

        const d = json.data || {};
        const snap: DbSnapshot = {
          users:         d.users             || [],
          plans:         d.plans             || [],
          participants:  d.plan_participants || [],
          circles:       d.circles           || [],
          circleMembers: d.circle_members    || [],
          userStats:     d.user_stats        || [],
          memories:      d.memories          || [],
          transactions:  d.transactions      || [],
          notifications: d.notifications     || [],
          userData:      d.user_data         || [],
          planReminders: d.plan_reminders    || [],
        };

        const fingerprint = JSON.stringify({ p: snap.plans.length, pp: snap.participants.length });
        if (fingerprint === lastSnapshotRef.current) return;
        lastSnapshotRef.current = fingerprint;

        applySnapshot(snap);
      } catch {
      }
    };

    const id = setInterval(poll, 6000);
    return () => clearInterval(id);
  }, [supabaseSyncStatus, myUuid, applySnapshot]);

  const pushToSupabase = async (table: string, records: any[]): Promise<any[] | null> => {
    try {
      const res = await fetch("/api/db/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table, records }),
      });
      if (!res.ok) { console.warn("[DB upsert]", table, "failed"); return null; }
      const result = await res.json();
      return result.data ?? null;
    } catch { return null; }
  };

  return {
    dbUsers, setDbUsers,
    dbPlans, setDbPlans,
    dbParticipants, setDbParticipants,
    dbCircles, setDbCircles,
    dbCircleMembers, setDbCircleMembers,
    dbTransactions, setDbTransactions,
    dbMemories, setDbMemories,
    circles, setCircles,
    notifications, setNotifications,
    transactions, setTransactions,
    walletBalance, setWalletBalance,
    supabaseConfig, setSupabaseConfig,
    supabaseSyncStatus, setSupabaseSyncStatus,
    pushToSupabase
  };
}

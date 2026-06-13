import React, { useState, useRef } from "react";
import {
  Bell, Users, Plus, Home, Calendar, Wallet
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile, Plan, Circle, NotificationItem, Transaction, DbCircle, DbCircleMember, DbPlan, DbPlanParticipant, DbTransaction, DbMemory } from "../core/types";
import { getInitialsAvatar, mapPlansToLegacyPlans, mapCirclesToLegacyCircles, mapTransactionsToLegacy, mapNotificationsToLegacy } from "../lib/mappers";
import { insertCircle, insertCircleMembers, syncUserStats, insertTransaction } from "../lib/db";
import { usePlansStore } from "../features/plans/state/PlansContext";
import { useProfileStore } from "../features/profile/state/ProfileContext";
import { useWalletStore } from "../features/wallet/state/WalletContext";
import { useCirclesStore } from "../features/circles/state/CirclesContext";
import { CirclesScreen } from "../features/circles/screens/CirclesScreen";
import { WalletScreen } from "../features/wallet/screens/WalletScreen";
import { HomeScreen } from "../features/home/screens/HomeScreen";
import { PlansScreen } from "../features/plans/screens/PlansScreen";
import { CreatePlanScreen } from "../features/create/screens/CreatePlanScreen";
import { ProfileScreen } from "../features/profile/screens/ProfileScreen";
import DetailedPlanModal from "../shared/modals/DetailedPlanModal";
import StoryRecapModal from "../shared/modals/StoryRecapModal";
import DbExplorerModal from "../shared/modals/DbExplorerModal";
import NotificationsTrayModal from "../shared/modals/NotificationsTrayModal";
import DepositCashModal from "../shared/modals/DepositCashModal";
import PaymentConfirmationModal from "../shared/modals/PaymentConfirmationModal";
import ReservationSuccessModal from "../shared/modals/ReservationSuccessModal";
import MemoryDetailModal from "../shared/modals/MemoryDetailModal";
import { isMemoryVisibleToUser } from "../lib/memoryVisibility";
import { hasOutstandingMemoryAction } from "../lib/memoryContribution";
interface MainAppProps {
  userProfile: UserProfile;
  onLogout: () => void;
  activeUserId: string;
}

export default function MainApp({ userProfile, onLogout, activeUserId }: MainAppProps) {
  // --- Decoupled Context Stores ---
  const { plans, setPlans, dbPlans, setDbPlans, dbPlanParticipants, setDbPlanParticipants, dbMemories, setDbMemories, dbMemoryAttendees, setDbMemoryAttendees, dbMemoryMovieVerdicts, setDbMemoryMovieVerdicts, dbMemoryRestaurantVotes, setDbMemoryRestaurantVotes, dbMemoryMatchResults, setDbMemoryMatchResults, dbMemoryMvpVotes, setDbMemoryMvpVotes, dbMemoryBadmintonResults, setDbMemoryBadmintonResults, dbPlanTeamAssignments, setDbPlanTeamAssignments, joinPlan, waitlistPlan, passPlan } = usePlansStore();
  const { dbUsers, setDbUsers, setDbUserData, setDbFriendships, updateProfile, activeUserUuid } = useProfileStore();
  const { circles, setCircles, dbCircles, setDbCircles, dbCircleMembers, setDbCircleMembers } = useCirclesStore();
  const { walletBalance, setWalletBalance, transactions, setTransactions, dbTransactions, setDbTransactions, refreshTransactions } = useWalletStore();

  // --- Core Navigation Tab state ---
  const [activeTab, setActiveTab] = useState<"home" | "plans" | "create" | "circles" | "wallet" | "profile">("home");
  const [showDbExplorer, setShowDbExplorer] = useState(false);
  const [selectedDbTable, setSelectedDbTable] = useState<string>("users");

  // --- Shared Overlays & Interactive States ---
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isTrackerExpanded, setIsTrackerExpanded] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationFilter, setNotificationFilter] = useState<"all" | "plans" | "payments" | "activity">("all");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  // Snooze and Auto-Pass overrides
  const [interestedPlanIds, setInterestedPlanIds] = useState<string[]>([]);
  const [snoozedPlanIds, setSnoozedPlanIds] = useState<string[]>([]);
  const [passedByPlanId, setPassedByPlanId] = useState<Record<string, string[]>>({});
  const [reminderSentPlanIds, setReminderSentPlanIds] = useState<string[]>([]);

  // Checkout splits overlay
  const [paymentConfirmationPlan, setPaymentConfirmationPlan] = useState<Plan | null>(null);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState<Plan | null>(null);
  const [showWaitlistSuccess, setShowWaitlistSuccess] = useState<Plan | null>(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");

  // Circle Navigation helpers
  const [circleCreateStep, setCircleCreateStep] = useState<"members" | "details" | null>(null);
  const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null);
  const [showNewCircleForm, setShowNewCircleForm] = useState(false);
  const [newCircleName, setNewCircleName] = useState("");
  const [newCircleUploadedImage, setNewCircleUploadedImage] = useState<string | null>(null);
  const [expandedCircleIds, setExpandedCircleIds] = useState<string[]>([]);
  const [isInvitingFriends, setIsInvitingFriends] = useState(false);

  // Coordinating states from Circles Tab back to Spontaneous Creator tab
  const [newPlanCircleId, setNewPlanCircleId] = useState("");
  const [newPlanTitle, setNewPlanTitle] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<any>(null);
  const [audienceType, setAudienceType] = useState<"circle" | "friends" | "multiple">("circle");
  const [selectedCircleIds, setSelectedCircleIds] = useState<string[]>([]);
  const [createFlowStep, setCreateFlowStep] = useState<"BROWSE" | "DETAILS" | "RECIPIENTS" | "EXTRA" | "PREVIEW">("BROWSE");

  // Immersive story recaps
  const [activeStoryRecap, setActiveStoryRecap] = useState<Plan | null>(null);
  const [storyIndex, setStoryIndex] = useState<number>(0);
  const [storyPlaying, setStoryPlaying] = useState<boolean>(true);
  const [editingMemory, setEditingMemory] = useState<DbMemory | null>(null);
  const [editedCaption, setEditedCaption] = useState<string>("");
  const [showAddMemoriesPrompt, setShowAddMemoriesPrompt] = useState<Plan | null>(null);
  const [memoryUploadPreview, setMemoryUploadPreview] = useState<string | null>(null);
  const [memoryUploadCaption, setMemoryUploadCaption] = useState<string>("");
  const [selectedMemoryPlan, setSelectedMemoryPlan] = useState<Plan | null>(null);

  React.useEffect(() => {
    console.log(
      "SELECTED_MEMORY_PLAN_CHANGED",
      selectedMemoryPlan?.id
    );
  }, [selectedMemoryPlan]);

  const homeFeedRef = useRef<HTMLDivElement>(null);

  // Triggering visual success confirmation toasts
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  React.useEffect(() => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(activeUserId)) {
      return;
    }
    async function syncData() {
      try {
        const res = await fetch("/api/db/fetch-all");
        if (res.ok) {
          const json = await res.json();
          if (json.configured && !json.tables_missing) {
            const d = json.data || {};
            
            // 1. Set profile context
            setDbUsers(d.users || []);
            setDbUserData(d.user_data || []);
            setDbFriendships(d.friendships || []);
            
            // 2. Set plans context
            setDbPlans(d.plans || []);
            setDbPlanParticipants(d.plan_participants || []);
            setDbMemories(d.memories || []);
            setDbMemoryAttendees(d.memory_attendees || []);
            setDbMemoryMovieVerdicts(d.memory_movie_verdicts || []);
            setDbMemoryRestaurantVotes(d.memory_restaurant_votes || []);
            setDbMemoryMatchResults(d.memory_match_results || []);
            setDbMemoryMvpVotes(d.memory_mvp_votes || []);
            setDbMemoryBadmintonResults(d.memory_badminton_results || []);
            setDbPlanTeamAssignments(d.plan_team_assignments || []);
            setPlans(mapPlansToLegacyPlans(d.plans || [], d.plan_participants || [], d.users || [], activeUserId, d.circles || []));
            
            // 3. Set circles context — only show circles where the current user is a member
            const allCircles = d.circles || [];
            const allCircleMembers = d.circle_members || [];
            const allDbUsers = d.users || [];
            const meUser = allDbUsers.find((u: any) => u.id === activeUserId || u.user_id === activeUserId);
            const meUuid = meUser ? meUser.id : activeUserId;
            const myCircleIds = meUuid
              ? allCircleMembers.filter((cm: any) => cm.user_id === meUuid).map((cm: any) => cm.circle_id)
              : [];
            const myCircles = allCircles.filter((c: any) => myCircleIds.includes(c.id));
            setDbCircles(allCircles);
            setDbCircleMembers(allCircleMembers);

            // Sync validation check: verify circles.created_by matches circle_members.role === 'host'
            allCircles.forEach((circleObj: any) => {
              const creatorUuid = circleObj.created_by;
              const creatorMember = allCircleMembers.find((cm: any) => cm.circle_id === circleObj.id && cm.user_id === creatorUuid);
              if (!creatorMember || creatorMember.role !== "host") {
                console.warn(`[Sync Validation Warning] Circle "${circleObj.name}" (ID: ${circleObj.id}) creator (ID: ${creatorUuid}) does not have 'host' role in circle_members. (Found role: ${creatorMember?.role || 'none'})`);
              }
            });
            
            // 4. Set wallet context
            const fetchedTxs = d.transactions || [];
            setDbTransactions(fetchedTxs);
            setTransactions(mapTransactionsToLegacy(fetchedTxs, allDbUsers, activeUserId, d.plans || []));

            // 5. Set notifications context
            const mappedNotifs = mapNotificationsToLegacy(d.notifications || [], d.plans || [], d.users || [], activeUserId);
            setNotifications(mappedNotifs);
          }
        }
      } catch (err) {
        console.error("Failed to fetch initial Supabase data:", err);
      }
    }
    syncData();
  }, [activeUserId]);

  // Snooze swipe vertical snooze actions
  const handleSnoozePlan = (planId: string) => {
    setSnoozedPlanIds(prev => [...prev, planId]);
    triggerToast("Snoozed: We'll show this plan again later");
  };

  // Sync selectedPlan state automatically when plans state updates
  React.useEffect(() => {
    if (selectedPlan) {
      const fresh = plans.find(p => p.id === selectedPlan.id);
      if (fresh) {
        setSelectedPlan(fresh);
      }
    }
  }, [plans]);

  // Enforce memory visibility for StoryRecapModal
  React.useEffect(() => {
    if (activeStoryRecap) {
      const mem = dbMemories.find(m => m.plan_id === activeStoryRecap.id);
      if (mem) {
        const isVisible = isMemoryVisibleToUser(
          mem,
          activeUserUuid || activeUserId,
          dbMemoryAttendees,
          dbPlans,
          dbCircleMembers
        );
        if (!isVisible) {
          setActiveStoryRecap(null);
        }
      }
    }
  }, [activeStoryRecap, dbMemories, activeUserUuid, activeUserId, dbMemoryAttendees, dbPlans, dbCircleMembers]);

  // Checkin join toggle
  const handleToggleJoin = async (plan: Plan) => {
    await joinPlan(plan.id, userProfile);

    // Sync Wallet & Ledger for cost-based plans without payment_required (which bypass Razorpay checkout but still deduct balance)
    if (plan.cost > 0 && !(plan as any).payment_required) {
      // Resolve UUIDs before writing to DB (transactions must use users.id, not user_id)
      const meTxUser = dbUsers.find(u => u.user_id === activeUserId);
      const meTxUuid = meTxUser?.id || activeUserUuid || activeUserId;
      const creatorTxUser = dbUsers.find(u => u.user_id === plan.creatorId || u.id === plan.creatorId);
      const creatorTxUuid = creatorTxUser?.id || plan.creatorId || null;

      const newDbTx = {
        transaction_id: `T_pay_${Date.now()}`,
        sender_id: meTxUuid,
        receiver_id: creatorTxUuid,
        plan_id: plan.dbUuid || plan.id,
        amount: plan.cost,
        transaction_type: "split_payment",
        status: "success",
        timestamp: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        created_at: new Date().toISOString()
      };
      await insertTransaction(newDbTx as any);
    }
    await refreshTransactions();
  };

  // Cash deposits
  const handleDepositMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(depositAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      triggerToast("Enter a valid amount to deposit");
      return;
    }

    // Resolve UUID for receiver before writing to DB
    const meDepUser = dbUsers.find(u => u.user_id === activeUserId);
    const meDepUuid = meDepUser?.id || activeUserUuid || activeUserId;
    const newDbTx = {
      transaction_id: `T_dep_${Date.now()}`,
      sender_id: "UPI",
      receiver_id: meDepUuid,
      plan_id: null,
      amount: amountNum,
      transaction_type: "deposit",
      status: "success",
      timestamp: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      created_at: new Date().toISOString()
    };
    await insertTransaction(newDbTx as any);
    await refreshTransactions();

    setDepositAmount("");
    setShowDepositModal(false);
    triggerToast(`💰 Added ₹${amountNum} successfully!`);
  };

  // Buddy groups creation
  const handleCreateCircle = (
    name: string,
    description: string,
    image: string | null,
    memberIds: string[]  // short user_id values e.g. "U002"
  ) => {
    if (!name.trim()) {
      triggerToast("Give your circle a name!");
      return;
    }

    const circleCover = image || getInitialsAvatar(name);

    // Resolve current user's UUID
    const meUser = dbUsers.find(u => u.user_id === activeUserId);
    const meUuid = meUser ? (meUser as any).id : activeUserId;

    const adminMemberObj = {
      userId: activeUserId,
      name: meUser?.full_name || userProfile.name,
      phone: meUser?.phone_number || "",
      avatar: meUser?.profile_photo || getInitialsAvatar(meUser?.full_name || userProfile.name)
    };

    const invitedMembers = memberIds.map(shortId => {
      const u = dbUsers.find(usr => usr.user_id === shortId);
      return {
        userId: shortId,
        name: u?.full_name || "Unknown Friend",
        phone: u?.phone_number || "",
        avatar: u?.profile_photo || getInitialsAvatar(u?.full_name || "Unknown Friend")
      };
    });

    const allMembersList = [adminMemberObj, ...invitedMembers];

    const tempCircleId = `__temp__${Date.now()}`;
    const now = new Date().toISOString();

    const tempDbCircle: DbCircle = {
      circle_id: tempCircleId,
      id: tempCircleId,
      name,
      description: description || "An active private circle for coordination.",
      category: "custom",
      created_by: meUuid,
      cover_image: circleCover,
      location_anchor: "Spontaneous",
      privacy: "private",
      created_at: now
    } as any;

    const tempDbCircleMembers: DbCircleMember[] = [
      {
        circle_member_id: `CM_temp_host_${Date.now()}`,
        circle_id: tempCircleId,
        user_id: meUuid,
        role: "host",
        joined_at: now
      },
      ...memberIds.map((shortId, idx) => {
        const uObj = dbUsers.find(u => u.user_id === shortId);
        const uUuid = uObj ? (uObj as any).id : shortId;
        return {
          circle_member_id: `CM_temp_member_${idx}_${Date.now()}`,
          circle_id: tempCircleId,
          user_id: uUuid,
          role: "member" as const,
          joined_at: now
        };
      })
    ];

    // Persist to Supabase (async, non-blocking)
    const persistCircle = async () => {
      try {
        const savedCircle = await insertCircle({
          circle_id: `c_${Date.now()}`,
          name,
          description: description || "An active private circle for coordination.",
          category: "custom",
          created_by: meUuid,
          cover_image: circleCover,
          location_anchor: "Spontaneous",
          privacy: "private",
          created_at: now
        });

        if (!savedCircle || !(savedCircle as any).id) {
          console.error("[Circles] insertCircle returned no UUID", savedCircle);
          return;
        }

        const circleUuid = (savedCircle as any).id;
        console.log("[Circles] Created circle UUID:", circleUuid);

        // Build member rows using UUIDs
        const membersToInsert = [
          { circle_id: circleUuid, user_id: meUuid, role: "host" as const, joined_at: now },
          ...memberIds.map(shortId => {
            const uObj = dbUsers.find(u => u.user_id === shortId);
            const uUuid = uObj ? (uObj as any).id : shortId;
            return { circle_id: circleUuid, user_id: uUuid, role: "member" as const, joined_at: now };
          })
        ];

        const insertedMembers = await insertCircleMembers(membersToInsert);
        console.log("[Circles] Inserted members:", insertedMembers?.length);

        // Sync stats for all members
        for (const m of membersToInsert) {
          await syncUserStats(m.user_id, "join_circle");
        }

        // Replace the temp circle in db states with real ones
        const realDbCircle: DbCircle = {
          circle_id: circleUuid,
          id: circleUuid,
          name,
          description: tempDbCircle.description,
          category: tempDbCircle.category,
          created_by: meUuid,
          cover_image: circleCover,
          location_anchor: tempDbCircle.location_anchor,
          privacy: tempDbCircle.privacy,
          created_at: now
        } as any;

        const realDbMembers: DbCircleMember[] = membersToInsert.map((m, idx) => ({
          circle_member_id: `CM_real_${idx}_${Date.now()}`,
          circle_id: circleUuid,
          user_id: m.user_id,
          role: m.role,
          joined_at: m.joined_at
        }));

        setDbCircles(prev => [realDbCircle, ...prev.filter(c => c.circle_id !== tempCircleId && c.id !== tempCircleId)]);
        setDbCircleMembers(prev => [
          ...prev.filter(m => m.circle_id !== tempCircleId),
          ...realDbMembers
        ]);
      } catch (err) {
        console.error("[Circles] Failed to persist circle:", err);
      }
    };

    // Show optimistic UI immediately by setting db states
    setDbCircles(prev => [tempDbCircle, ...prev]);
    setDbCircleMembers(prev => [...prev, ...tempDbCircleMembers]);

    persistCircle();

    setNewCircleName("");
    setNewCircleUploadedImage(null);
    setShowNewCircleForm(false);
    triggerToast(`👥 Circle "${name}" created!`);
  };

  // Settle overdue shared split bills from Notifications list
  const handleSettleOverdue = async (notification: NotificationItem) => {
    const cost = notification.cost || 0;
    if (cost > walletBalance) {
      triggerToast(`Unable to settle. Please top-up ₹${cost - walletBalance} into wallet.`);
      setActiveTab("profile");
      return;
    }

    // Resolve UUIDs before writing to DB
    const meStlUser = dbUsers.find(u => u.user_id === activeUserId);
    const meStlUuid = meStlUser?.id || activeUserUuid || activeUserId;
    const creatorStlUser = dbUsers.find(u => u.user_id === notification.creatorId || u.id === notification.creatorId);
    const creatorStlUuid = creatorStlUser?.id || notification.creatorId || null;
    const newDbTx = {
      transaction_id: `T_stl_${Date.now()}`,
      sender_id: meStlUuid,
      receiver_id: creatorStlUuid,
      plan_id: notification.planId || null,
      amount: cost,
      transaction_type: "settlement",
      status: "success",
      timestamp: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      created_at: new Date().toISOString()
    };
    await insertTransaction(newDbTx as any);
    await refreshTransactions();

    setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, settled: true } : n));
    // Persist read/settled status to Supabase database
    fetch("/api/db/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "notifications",
        records: [{ id: notification.id, is_read: true }]
      })
    }).catch(err => console.error("Failed to mark notification as read:", err));

    triggerToast("✅ Settled & shared with circle!");
  };

  const handleAcceptInviteFromNotif = async (notif: NotificationItem) => {
    if (!notif.planId) return;
    const targetPlan = plans.find(p => p.id === notif.planId);
    if (targetPlan) {
      await handleToggleJoin(targetPlan);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, settled: true } : n));
      // Persist read/settled status to Supabase database
      fetch("/api/db/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: "notifications",
          records: [{ id: notif.id, is_read: true }]
        })
      }).catch(err => console.error("Failed to mark notification as read:", err));
    }
  };

  const handleOpenNotification = async (notif: NotificationItem) => {
    // 1. Mark read in DB if not already read
    if (!notif.settled) {
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, settled: true } : n));
      fetch("/api/db/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: "notifications",
          records: [{ id: notif.id, is_read: true }]
        })
      }).catch(err => console.error("Failed to mark notification as read:", err));
    }

    // 2. Open associated plan preview
    if (notif.planId) {
      const plan = plans.find(p => p.plan_id === notif.planId || p.id === notif.planId);
      if (plan) {
        setSelectedPlan(plan);
        setShowNotifications(false);
      }
    }
  };

  // Syncing countdown timers
  const upcomingCirclePlans = React.useMemo(() => {
    return plans.filter(p => !p.isHappened && p.status !== "cancelled");
  }, [plans]);

  // Resolve current user's UUID
  const meUserObj = React.useMemo(() => {
    return dbUsers.find(u => u.user_id === activeUserId);
  }, [dbUsers, activeUserId]);

  const meUuid = React.useMemo(() => {
    return meUserObj ? (meUserObj as any).id : activeUserId;
  }, [meUserObj, activeUserId]);

  // Filter plans based on visibility rules:
  // A plan is visible on Home strictly based on plan_participants record status.
  const myParticipantRecords = React.useMemo(() => {
    return dbPlanParticipants.filter(pp => pp.user_id === meUuid);
  }, [dbPlanParticipants, meUuid]);

  const discoverablePlans = React.useMemo(() => {
    return plans.filter(p => {
      if (p.status === "cancelled") return false;
      const planUuid = p.dbUuid || p.id;
      const ppRecord = myParticipantRecords.find(pp => pp.plan_id === planUuid);

      if (!ppRecord) {
        return false;
      }

      const status = ppRecord.status;
      const isIncluded = ["delivered", "seen", "new", "waitlist"].includes(status);

      if (!isIncluded) {
        return false;
      }

      if (p.response_deadline_at) {
        const deadline = new Date(p.response_deadline_at).getTime();
        const now = new Date().getTime();
        if (now > deadline) {
          return false;
        }
      }

      return true;
    });
  }, [plans, myParticipantRecords]);

  const homeBadgeCount = React.useMemo(() => {
    return discoverablePlans.length;
  }, [discoverablePlans]);

  const pendingMemoryCount = React.useMemo(() => {
    return dbMemories.filter(memory => {
      const plan = plans.find(p => p.id === memory.plan_id || p.dbUuid === memory.plan_id);
      if (!plan) return false;
      const isHost = plan.hostId === activeUserUuid || plan.hostId === activeUserId || plan.creatorId === activeUserUuid || plan.creatorId === activeUserId;
      const attendees = dbMemoryAttendees.filter(a => a.memory_id === memory.id);
      const verdicts = dbMemoryMovieVerdicts.filter(v => v.memory_id === memory.id);
      const votes = dbMemoryRestaurantVotes.filter(v => v.memory_id === memory.id);
      const results = dbMemoryMatchResults.filter(r => r.memory_id === memory.id);
      const mvps = dbMemoryMvpVotes.filter(v => v.memory_id === memory.id);
      const badmintons = dbMemoryBadmintonResults.filter(r => r.memory_id === memory.id);
      const userId = activeUserUuid || activeUserId;
      return hasOutstandingMemoryAction(
        memory,
        userId,
        isHost,
        attendees,
        verdicts,
        votes,
        results,
        mvps,
        badmintons
      );
    }).length;
  }, [dbMemories, plans, activeUserId, activeUserUuid, dbMemoryAttendees, dbMemoryMovieVerdicts, dbMemoryRestaurantVotes, dbMemoryMatchResults, dbMemoryMvpVotes, dbMemoryBadmintonResults]);

  const completedMemories = React.useMemo(() => {
    return dbMemories.filter(memory => {
      const plan = plans.find(p => p.id === memory.plan_id || p.dbUuid === memory.plan_id);
      if (!plan) return false;
      const userId = activeUserUuid || activeUserId;
      return dbMemoryAttendees.some(a => a.memory_id === memory.id && a.user_id === userId);
    }).map(memory => {
      const plan = plans.find(p => p.id === memory.plan_id || p.dbUuid === memory.plan_id)!;
      const userId = activeUserUuid || activeUserId;
      const isHost = plan.hostId === activeUserUuid || plan.hostId === activeUserId || plan.creatorId === activeUserUuid || plan.creatorId === activeUserId;
      const attendees = dbMemoryAttendees.filter(a => a.memory_id === memory.id);
      const verdicts = dbMemoryMovieVerdicts.filter(v => v.memory_id === memory.id);
      const votes = dbMemoryRestaurantVotes.filter(v => v.memory_id === memory.id);
      const results = dbMemoryMatchResults.filter(r => r.memory_id === memory.id);
      const mvps = dbMemoryMvpVotes.filter(v => v.memory_id === memory.id);
      const badmintons = dbMemoryBadmintonResults.filter(r => r.memory_id === memory.id);

      const isPending = hasOutstandingMemoryAction(
        memory,
        userId,
        isHost,
        attendees,
        verdicts,
        votes,
        results,
        mvps,
        badmintons
      );

      let title = plan.title;
      let subtitle = "";
      const mType = (memory.memory_type || "").toLowerCase();
      if (mType === "movie") {
        subtitle = "✓ Memory Recorded";
      } else if (mType === "dining") {
        subtitle = "✓ Memory Recorded";
      } else if (mType === "football") {
        subtitle = "✓ Result Recorded";
      } else if (mType === "badminton") {
        subtitle = "✓ Results Recorded";
      }

      return {
        memory,
        plan,
        title,
        subtitle,
        isPending
      };
    });
  }, [dbMemories, plans, activeUserId, activeUserUuid, dbMemoryAttendees, dbMemoryMovieVerdicts, dbMemoryRestaurantVotes, dbMemoryMatchResults, dbMemoryMvpVotes, dbMemoryBadmintonResults]);

  const filteredNotifications = React.useMemo(() => {
    return notifications.filter(n => {
      if (notificationFilter === "all") return true;
      if (notificationFilter === "plans") return n.type === "general" || n.type === "invitation";
      if (notificationFilter === "payments") return n.type === "payments" || n.type === "payment";
      return false;
    });
  }, [notifications, notificationFilter]);

  return (
    <div className="w-full h-full max-w-md mx-auto bg-[#0C0C0E] flex flex-col justify-between relative shadow-2xl overflow-hidden border border-zinc-900 select-none">
      
      {/* ---------------- FIGMA ALIGNED HEADER ---------------- */}
      {activeTab === "home" && (
        <header id="figma_coordinate_header" className="h-14 shrink-0 border-b border-zinc-950 bg-[#09090b]/99 backdrop-blur-md flex items-center justify-between px-4 z-30 select-none relative">
          <div className="flex items-center gap-1.5 z-10">
            <button
              onClick={() => {
                setActiveTab("profile");
                setShowNotifications(false);
              }}
              className="relative group shrink-0 block focus:outline-none cursor-pointer"
              aria-label="View Profile Settings"
            >
              <img
                src={userProfile.avatar}
                alt={userProfile.name}
                className="w-9 h-9 rounded-full border-2 border-zinc-800 object-cover hover:border-[#ff8b66] transition-colors"
                referrerPolicy="no-referrer"
              />
            </button>
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <h1 className="text-stone-100 font-sans font-black text-xl tracking-[0.25em] leading-none text-center">
              PLANLESS
            </h1>
          </div>

          <div className="flex items-center gap-1.5 z-10">
            <button
              id="bell_notification_trigger"
              onClick={() => setShowNotifications(!showNotifications)}
              className={`w-9 h-9 rounded-full flex items-center justify-center relative cursor-pointer transition-all ${showNotifications ? "bg-zinc-900 text-white" : "text-zinc-400 hover:text-white"}`}
            >
              <Bell className="w-4.5 h-4.5" />
              {(notifications.some(n => !n.settled) || pendingMemoryCount > 0) && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-[#ff5d41] rounded-full ring-2 ring-zinc-950 shadow animate-pulse" />
              )}
            </button>
          </div>
        </header>
      )}

      {/* --- TOAST ALERTS --- */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-[#121215] border border-brand-peach/30 text-brand-peach px-4.5 py-2.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider shadow-lg flex items-center gap-1.5"
          >
            <span>⚡</span>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- MAIN APP SCREEN FRAME BODY ---------------- */}
      <main
        id="app_tab_content_wrapper"
        className={`flex-1 relative ${
          activeTab === "home"
            ? "overflow-hidden p-0"
            : activeTab === "circles" && selectedCircle
            ? "overflow-hidden p-4 pb-4"
            : "overflow-y-auto no-scrollbar p-4 pb-12"
        }`}
      >
        {/* TAB 1: HOME PANEL */}
        {activeTab === "home" && (
          <HomeScreen
            discoverablePlans={discoverablePlans}
            userProfile={userProfile}
            interestedPlanIds={interestedPlanIds}
            setSelectedPlan={setSelectedPlan}
            setSelectedMemoryPlan={setSelectedMemoryPlan}
            setPaymentConfirmationPlan={setPaymentConfirmationPlan}
            walletBalance={walletBalance}
            handleToggleJoin={handleToggleJoin}
            setShowPaymentSuccess={setShowPaymentSuccess}
            setShowWaitlistSuccess={setShowWaitlistSuccess}
            setNotifications={setNotifications}
            triggerToast={triggerToast}
            activeCardId={activeCardId}
            setActiveCardId={setActiveCardId}
            handleSnoozePlan={handleSnoozePlan}
            handleWaitlistPlan={waitlistPlan}
            homeFeedRef={homeFeedRef}
          />
        )}

        {/* TAB 2: PLANS — PREMIUM ACTIVITY HUB */}
        {activeTab === "plans" && (
          <PlansScreen
            setSelectedPlan={setSelectedPlan}
            passedByPlanId={passedByPlanId}
          />
        )}

        {/* TAB 3: SPONTANEOUS CREATOR - INSTANT PRODUCTIVITY AESTHETICS */}
        {activeTab === "create" && (
          <CreatePlanScreen
            setActiveTab={setActiveTab}
            triggerToast={triggerToast}
            notifications={notifications}
            setNotifications={setNotifications}
          />
        )}

        {/* TAB 4: CIRCLES / BUDDY GROUPS THREAD */}
        {activeTab === "circles" && (
          <CirclesScreen
            circleCreateStep={circleCreateStep}
            setCircleCreateStep={setCircleCreateStep}
            circles={circles}
            selectedCircle={selectedCircle}
            setSelectedCircle={setSelectedCircle}
            notifications={notifications}
            setNotifications={setNotifications}
            activeUserId={activeUserId}
            userProfile={userProfile}
            dbCircleMembers={dbCircleMembers}
            setDbCircleMembers={setDbCircleMembers}
            upcomingCirclePlans={upcomingCirclePlans}
            showNewCircleForm={showNewCircleForm}
            setShowNewCircleForm={setShowNewCircleForm}
            newCircleName={newCircleName}
            setNewCircleName={setNewCircleName}
            newCircleUploadedImage={newCircleUploadedImage}
            setNewCircleUploadedImage={setNewCircleUploadedImage}
            expandedCircleIds={expandedCircleIds}
            setExpandedCircleIds={setExpandedCircleIds}
            isInvitingFriends={isInvitingFriends}
            setIsInvitingFriends={setIsInvitingFriends}
            setNewPlanCircleId={setNewPlanCircleId}
            setNewPlanTitle={setNewPlanTitle}
            setSelectedExperience={setSelectedPreset}
            setAudienceType={setAudienceType}
            setSelectedCircleIds={setSelectedCircleIds}
            setActiveTab={setActiveTab}
            setCreateFlowStep={setCreateFlowStep}
            triggerToast={triggerToast}
            dbUsers={dbUsers}
            setCircles={setCircles}
            plans={plans}
            setPaymentConfirmationPlan={setPaymentConfirmationPlan}
            handleToggleJoin={handleToggleJoin}
            setSelectedPlan={setSelectedPlan}
            setActiveStoryRecap={setActiveStoryRecap}
            setSelectedMemoryPlan={setSelectedMemoryPlan}
            handleCreateCircle={handleCreateCircle}
          />
        )}

        {/* TAB: WALLET */}
        {activeTab === "wallet" && (
          <WalletScreen
            walletBalance={walletBalance}
            transactions={transactions}
            setShowDepositModal={setShowDepositModal}
            setActiveTab={setActiveTab}
          />
        )}

        {/* TAB 5: PROFILE & ACCOUNT MANAGEMENT */}
        {activeTab === "profile" && (
          <ProfileScreen
            onLogout={onLogout}
            triggerToast={triggerToast}
            setSelectedPlan={setSelectedPlan}
            setSelectedMemoryPlan={setSelectedMemoryPlan}
            setShowDbExplorer={setShowDbExplorer}
            setShowDepositModal={setShowDepositModal}
          />
        )}
      </main>

      {/* ---------------- ACTIVE DETAILED OVERLAY POPUP (PLAN DETAILS) ---------------- */}
      {selectedPlan && (
        <DetailedPlanModal
          selectedPlan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          userProfile={userProfile}
          triggerToast={triggerToast}
          activeUserId={activeUserId}
          setSelectedMemoryPlan={setSelectedMemoryPlan}
          onNavigateToCircle={(circleId) => {
            const circleObj = dbCircles.find(c => c.circle_id === circleId || c.id === circleId);
            if (circleObj) {
              const legacyCircles = mapCirclesToLegacyCircles(dbCircles, dbCircleMembers, dbUsers);
              const legacyCircle = legacyCircles.find(c => c.id === circleId || c.dbUuid === circleId);
              if (legacyCircle) {
                setSelectedCircle(legacyCircle);
              }
            }
            setActiveTab("circles");
          }}
        />
      )}

      {/* ---------------- 🎬 IMMERSIVE FIGMA FULLSCREEN STORY RECAP MODAL ---------------- */}
      <AnimatePresence>
        {activeStoryRecap && (() => {
          const mem = dbMemories.find(m => m.plan_id === activeStoryRecap.id);
          const isVisible = !mem || isMemoryVisibleToUser(
            mem,
            activeUserUuid || activeUserId,
            dbMemoryAttendees,
            dbPlans,
            dbCircleMembers
          );
          if (!isVisible) return null;
          return (
            <StoryRecapModal
              activeStoryRecap={activeStoryRecap}
              onClose={() => setActiveStoryRecap(null)}
              dbMemories={dbMemories}
              activeUserId={activeUserId}
              dbUsers={dbUsers}
              storyIndex={storyIndex}
            />
          );
        })()}
      </AnimatePresence>

      {/* ---------------- 📝 MEMORY DETAIL MODAL ---------------- */}
      {selectedMemoryPlan && (() => {
        let mem = dbMemories.find(m => m.plan_id === selectedMemoryPlan.id || m.plan_id === selectedMemoryPlan.dbUuid);
        if (!mem) {
          const category = selectedMemoryPlan.category;
          const activityType = selectedMemoryPlan.activity_type || selectedMemoryPlan.activityType || "";
          let memory_type = "football";
          if (category === "movies") {
            memory_type = "movie";
          } else if (category === "dining") {
            memory_type = "dining";
          } else if (category === "sports") {
            if (activityType === "badminton") {
              memory_type = "badminton";
            }
          }
          mem = {
            id: "temp_" + (selectedMemoryPlan.dbUuid || selectedMemoryPlan.id),
            plan_id: selectedMemoryPlan.dbUuid || selectedMemoryPlan.id,
            memory_type,
            status: "pending",
            created_at: new Date().toISOString(),
            editable_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          };
        }
        return (
          <MemoryDetailModal
            plan={selectedMemoryPlan}
            memory={mem}
            onClose={() => setSelectedMemoryPlan(null)}
            activeUserId={activeUserUuid || activeUserId}
            dbUsers={dbUsers}
            memoryAttendees={dbMemoryAttendees}
            memoryMovieVerdicts={dbMemoryMovieVerdicts}
            memoryRestaurantVotes={dbMemoryRestaurantVotes}
            memoryMatchResults={dbMemoryMatchResults}
            memoryMvpVotes={dbMemoryMvpVotes}
            dbMemoryBadmintonResults={dbMemoryBadmintonResults}
          />
        );
      })()}

      {/* ---------------- 💾 RELATIONAL DATABASE EXPLORER ---------------- */}
      <DbExplorerModal
        isOpen={showDbExplorer}
        onClose={() => setShowDbExplorer(false)}
        selectedDbTable={selectedDbTable}
        setSelectedDbTable={setSelectedDbTable}
        dbUsers={dbUsers}
        dbCircles={dbCircles}
        dbCircleMembers={dbCircleMembers}
        dbPlans={dbPlans}
        dbPlanParticipants={dbPlanParticipants}
        dbTransactions={dbTransactions}
        dbMemories={dbMemories}
        dbMemoryAttendees={dbMemoryAttendees}
        dbMemoryMovieVerdicts={dbMemoryMovieVerdicts}
        dbMemoryRestaurantVotes={dbMemoryRestaurantVotes}
        dbMemoryMatchResults={dbMemoryMatchResults}
        dbMemoryMvpVotes={dbMemoryMvpVotes}
      />

      {/* ---------------- NOTIFICATIONS TRAY ---------------- */}
      <NotificationsTrayModal
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        filteredNotifications={filteredNotifications}
        handleAcceptInviteFromNotif={handleAcceptInviteFromNotif}
        handleOpenNotification={handleOpenNotification}
        completedMemories={completedMemories}
        onSelectMemoryPlan={(plan) => {
          setSelectedMemoryPlan(plan);
          setShowNotifications(false);
        }}
      />

      {/* ---------------- DEPOSIT CASH MODAL ---------------- */}
      <DepositCashModal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        depositAmount={depositAmount}
        setDepositAmount={setDepositAmount}
        handleDepositMoney={handleDepositMoney}
      />

      {/* 💳 LIGHTWEIGHT PAYMENT CONFIRMATION SCREEN */}
      <PaymentConfirmationModal
        paymentConfirmationPlan={paymentConfirmationPlan}
        onClose={() => setPaymentConfirmationPlan(null)}
        walletBalance={walletBalance}
        setWalletBalance={setWalletBalance}
        setTransactions={setTransactions}
        handleToggleJoin={handleToggleJoin}
        setSelectedPlan={setSelectedPlan}
        setShowPaymentSuccess={setShowPaymentSuccess}
      />

      {/* RESERVATION SUCCESS OVERLAYS */}
      <ReservationSuccessModal
        showPaymentSuccess={showPaymentSuccess}
        onClose={() => setShowPaymentSuccess(null)}
        setActiveTab={setActiveTab}
      />

      {/* ---------------- NAVIGATION FOOTER TABS ---------------- */}
      {!(activeTab === "circles" && selectedCircle) && (
        <footer id="main_app_footer_nav" className="h-18 shrink-0 border-t border-zinc-950 bg-[#09090b]/99 backdrop-blur-md flex justify-around items-center px-4 z-30 pb-2 shadow-2xl relative select-none">
          <button
            id="nav_item_home"
            onClick={() => { setActiveTab("home"); setShowNotifications(false); }}
            className={`flex flex-col items-center justify-center w-12 h-12 transition-all cursor-pointer ${activeTab === "home" ? "text-[#ff8b66]" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            <div className="relative">
              <Home className="w-4.5 h-4.5" />
              {homeBadgeCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#f43f5e] text-white text-[8px] font-sans font-black w-3.5 h-3.5 rounded-full flex items-center justify-center shadow">
                  {homeBadgeCount}
                </span>
              )}
            </div>
            <span className="text-[9px] font-sans tracking-wide mt-1 font-medium">Home</span>
          </button>

          <button
            id="nav_item_plans"
            onClick={() => { setActiveTab("plans"); setShowNotifications(false); }}
            className={`flex flex-col items-center justify-center w-12 h-12 transition-all cursor-pointer ${activeTab === "plans" ? "text-[#ff8b66]" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            <Calendar className="w-4.5 h-4.5" />
            <span className="text-[9px] font-sans tracking-wide mt-1 font-medium">Plans</span>
          </button>

          <button
            id="nav_item_create"
            onClick={() => {
              setActiveTab("create");
              setShowNotifications(false);
            }}
            className="flex flex-col items-center justify-center w-12 h-12 transition-all cursor-pointer"
          >
            <div className={`w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center ${activeTab === "create" ? "border-[#ff8b66]" : ""}`}>
              <Plus className="w-4 h-4 text-[#ff8b66]" />
            </div>
            <span className="text-[9px] font-sans tracking-wide mt-0.5 font-medium">Create</span>
          </button>

          <button
            id="nav_item_circles"
            onClick={() => { setActiveTab("circles"); setShowNotifications(false); }}
            className={`flex flex-col items-center justify-center w-12 h-12 transition-all cursor-pointer ${activeTab === "circles" ? "text-[#ff8b66]" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            <Users className="w-4.5 h-4.5" />
            <span className="text-[9px] font-sans tracking-wide mt-1 font-medium">Circle</span>
          </button>

          <button
            id="nav_item_wallet"
            onClick={() => { setActiveTab("wallet"); setShowNotifications(false); }}
            className={`flex flex-col items-center justify-center w-12 h-12 transition-all cursor-pointer ${activeTab === "wallet" ? "text-[#ff8b66]" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            <Wallet className="w-4.5 h-4.5" />
            <span className="text-[9px] font-sans tracking-wide mt-1 font-medium">Wallet</span>
          </button>
        </footer>
      )}

      {activeTab === "circles" && !circleCreateStep && !selectedCircle && (
        <div className="absolute bottom-[84px] right-4 z-50 animate-fade-in">
          <button
            type="button"
            onClick={() => setCircleCreateStep("members")}
            className="inline-flex h-13 w-13 items-center justify-center rounded-full bg-[#09090b] border-2 border-[#ff8b66] text-[#ff8b66] shadow-lg transition-transform hover:scale-[1.06] active:scale-[0.95]"
          >
            <div className="relative">
              <span className="text-xl">👥</span>
              <span className="absolute -top-1.5 -right-2 bg-black border border-[#ff8b66] text-[#ff8b66] font-bold text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center">+</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

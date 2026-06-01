import React, { useState, useRef } from "react";
import {
  Bell, Users, Plus, Home, Calendar, Wallet
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile, Plan, Circle, NotificationItem, Transaction, DbCircle, DbCircleMember, DbPlan, DbPlanParticipant, DbTransaction, DbMemory } from "../core/types";
import { getInitialsAvatar, mapPlansToLegacyPlans, mapCirclesToLegacyCircles, mapTransactionsToLegacy, mapNotificationsToLegacy } from "../lib/mappers";
import { insertCircle, insertCircleMembers, syncUserStats } from "../lib/db";
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
interface MainAppProps {
  userProfile: UserProfile;
  onLogout: () => void;
  activeUserId: string;
}

export default function MainApp({ userProfile, onLogout, activeUserId }: MainAppProps) {
  // --- Decoupled Context Stores ---
  const { plans, setPlans, dbPlans, setDbPlans, dbPlanParticipants, setDbPlanParticipants, dbMemories, setDbMemories, joinPlan, waitlistPlan } = usePlansStore();
  const { dbUsers, setDbUsers, setDbUserData, updateProfile } = useProfileStore();
  const { circles, setCircles, dbCircles, setDbCircles, dbCircleMembers, setDbCircleMembers } = useCirclesStore();
  const { walletBalance, setWalletBalance, transactions, setTransactions, dbTransactions, setDbTransactions } = useWalletStore();

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

  const homeFeedRef = useRef<HTMLDivElement>(null);

  // Triggering visual success confirmation toasts
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  React.useEffect(() => {
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
            
            // 2. Set plans context
            setDbPlans(d.plans || []);
            setDbPlanParticipants(d.plan_participants || []);
            setDbMemories(d.memories || []);
            setPlans(mapPlansToLegacyPlans(d.plans || [], d.plan_participants || [], d.users || [], activeUserId));
            
            // 3. Set circles context — only show circles where the current user is a member
            const allCircles = d.circles || [];
            const allCircleMembers = d.circle_members || [];
            const allDbUsers = d.users || [];
            const meUser = allDbUsers.find((u: any) => u.user_id === activeUserId);
            const meUuid = meUser ? meUser.id : null;
            const myCircleIds = meUuid
              ? allCircleMembers.filter((cm: any) => cm.user_id === meUuid).map((cm: any) => cm.circle_id)
              : [];
            const myCircles = allCircles.filter((c: any) => myCircleIds.includes(c.id));
            setDbCircles(allCircles);
            setDbCircleMembers(allCircleMembers);
            setCircles(mapCirclesToLegacyCircles(myCircles, allCircleMembers, allDbUsers));
            
            // 4. Set wallet context
            const me = (d.users || []).find((u: any) => u.user_id === activeUserId);
            if (me) {
              setWalletBalance(Number(me.wallet_balance) || 0);
            }
            setDbTransactions(d.transactions || []);
            setTransactions(mapTransactionsToLegacy(d.transactions || [], d.users || [], activeUserId));

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

  // Checkin join toggle
  const handleToggleJoin = async (plan: Plan) => {
    await joinPlan(plan.id, userProfile);

    // Sync Wallet & Ledger
    if (plan.cost > 0) {
      setWalletBalance(prev => prev - plan.cost);
      const feeTx: Transaction = {
        id: `t_fee_${Date.now()}`,
        title: `Joined turf: ${plan.title}`,
        amount: plan.cost,
        type: "debit",
        timestamp: "Today",
        settled: true
      };
      setTransactions(prev => [feeTx, ...prev]);

      const newDbTx: DbTransaction = {
        transaction_id: `T_${Date.now()}`,
        sender_id: activeUserId,
        receiver_id: plan.creatorId || "U002",
        plan_id: plan.id,
        amount: plan.cost,
        transaction_type: "split_payment",
        status: "success",
        timestamp: "Today"
      };
      setDbTransactions(prev => [newDbTx, ...prev]);
      setDbUsers(prev => prev.map(u => u.user_id === activeUserId ? { ...u, wallet_balance: u.wallet_balance - plan.cost } : u));
    }
  };

  // Cash deposits
  const handleDepositMoney = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(depositAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      triggerToast("Enter a valid amount to deposit");
      return;
    }

    setWalletBalance(prev => prev + amountNum);
    const newTx: Transaction = {
      id: `t_${Date.now()}`,
      title: "Added Money (UPI)",
      amount: amountNum,
      type: "credit",
      timestamp: "Today",
      settled: true
    };
    setTransactions(prev => [newTx, ...prev]);

    setDbUsers(prevUsers => prevUsers.map(u => u.user_id === activeUserId ? { ...u, wallet_balance: u.wallet_balance + amountNum } : u));
    const newDbTx: DbTransaction = {
      transaction_id: `T_${Date.now()}`,
      sender_id: "UPI",
      receiver_id: activeUserId,
      plan_id: null,
      amount: amountNum,
      transaction_type: "deposit",
      status: "success",
      timestamp: "Today"
    };
    setDbTransactions(prev => [newDbTx, ...prev]);

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

    // Persist to Supabase (async, non-blocking)
    const persistCircle = async () => {
      try {
        const now = new Date().toISOString();
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
          { circle_id: circleUuid, user_id: meUuid, role: "admin" as const, joined_at: now },
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

        // Optimistically update local state with real UUID for the circle
        const newLegacyCircle: Circle = {
          id: circleUuid,
          dbUuid: circleUuid,
          name,
          membersCount: allMembersList.length,
          avatars: allMembersList.slice(0, 5).map(m => m.avatar),
          groupImage: circleCover,
          lastSpontaneousActivity: "Newly created circle",
          description: description || "An active private circle for coordination.",
          type: "Custom Group",
          location: "Spontaneous",
          format: "Chill crew",
          playersOnField: allMembersList.length,
          timeWindow: "Anytime",
          membersList: allMembersList
        };
        // Replace the temp circle with the real one (identified by UUID)
        setCircles(prev => [newLegacyCircle, ...prev.filter(c => c.id !== "__temp__" + name)]);
      } catch (err) {
        console.error("[Circles] Failed to persist circle:", err);
      }
    };

    // Show optimistic UI immediately with a temp entry
    const tempCircle: Circle = {
      id: "__temp__" + name,
      dbUuid: undefined,
      name,
      membersCount: allMembersList.length,
      avatars: allMembersList.slice(0, 5).map(m => m.avatar),
      groupImage: circleCover,
      lastSpontaneousActivity: "Newly created circle",
      description: description || "An active private circle for coordination.",
      type: "Custom Group",
      location: "Spontaneous",
      format: "Chill crew",
      playersOnField: allMembersList.length,
      timeWindow: "Anytime",
      membersList: allMembersList
    };
    setCircles(prev => [tempCircle, ...prev]);

    persistCircle();

    setNewCircleName("");
    setNewCircleUploadedImage(null);
    setShowNewCircleForm(false);
    triggerToast(`👥 Circle "${name}" created!`);
  };

  // Settle overdue shared split bills from Notifications list
  const handleSettleOverdue = (notification: NotificationItem) => {
    const cost = notification.cost || 0;
    if (cost > walletBalance) {
      triggerToast(`Unable to settle. Please top-up ₹${cost - walletBalance} into wallet.`);
      setActiveTab("profile");
      return;
    }

    setWalletBalance(prev => prev - cost);

    const settleTx: Transaction = {
      id: `t_${Date.now()}`,
      title: `Settled ${notification.title.split("-")[0]}`,
      amount: cost,
      type: "debit",
      timestamp: "Today",
      settled: true
    };
    setTransactions(prev => [settleTx, ...prev]);

    setDbUsers(prevUsers => prevUsers.map(u => u.user_id === activeUserId ? { ...u, wallet_balance: u.wallet_balance - cost } : u));
    const newDbTx: DbTransaction = {
      transaction_id: `T_${Date.now()}`,
      sender_id: activeUserId,
      receiver_id: notification.creatorId || "U002",
      plan_id: notification.planId || null,
      amount: cost,
      transaction_type: "settlement",
      status: "success",
      timestamp: "Today"
    };
    setDbTransactions(prev => [newDbTx, ...prev]);

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

  // Syncing countdown timers
  const upcomingCirclePlans = plans.filter(p => !p.isHappened);

  // Filter plans based on visibility rules:
  // A plan is visible on Home strictly based on plan_participants record status.
  const discoverablePlans = plans.filter(p => {
    // Resolve current user's UUID and short ID
    const myEntry = p.members.find(
      m => m.userId === userProfile.user_id || (userProfile.dbUuid && (m as any).userUuid === userProfile.dbUuid)
    );
    const myStatus = myEntry?.joinState;

    const isIncluded = myStatus && ["delivered", "seen"].includes(myStatus);

    if (isIncluded) {
      console.log(`[HomeScreen Visibility INCLUDED] Current User ID: ${userProfile.user_id} (${userProfile.dbUuid}), Plan: "${p.title}", Status: ${myStatus}`);
    } else {
      console.log(`[HomeScreen Visibility EXCLUDED] Current User ID: ${userProfile.user_id} (${userProfile.dbUuid}), Plan: "${p.title}", Status: ${myStatus || "none"}`);
    }

    return !!isIncluded;
  });

  // Log visible plans
  console.log(`[HomeScreen Visible Plans] Current User: ${userProfile.user_id}, Visible Count: ${discoverablePlans.length}, Plans:`, discoverablePlans.map(p => p.title));

  const homeBadgeCount = discoverablePlans.length;

  const filteredNotifications = notifications.filter(n => {
    if (notificationFilter === "all") return true;
    if (notificationFilter === "plans") return n.type === "general" || n.type === "invitation";
    if (notificationFilter === "payments") return n.type === "payments" || n.type === "payment";
    return false;
  });

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
              {notifications.some(n => !n.settled) && (
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
        className={`flex-1 relative ${activeTab === "home" ? "overflow-hidden p-0" : "overflow-y-auto no-scrollbar p-4 pb-12"}`}
      >
        {/* TAB 1: HOME PANEL */}
        {activeTab === "home" && (
          <HomeScreen
            discoverablePlans={discoverablePlans}
            userProfile={userProfile}
            interestedPlanIds={interestedPlanIds}
            setSelectedPlan={setSelectedPlan}
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
          reminderSentPlanIds={reminderSentPlanIds}
          passedByPlanId={passedByPlanId}
          setReminderSentPlanIds={setReminderSentPlanIds}
          setPassedByPlanId={setPassedByPlanId}
          triggerToast={triggerToast}
        />
      )}

      {/* ---------------- 🎬 IMMERSIVE FIGMA FULLSCREEN STORY RECAP MODAL ---------------- */}
      <AnimatePresence>
        {activeStoryRecap && (
          <StoryRecapModal
            activeStoryRecap={activeStoryRecap}
            onClose={() => setActiveStoryRecap(null)}
            dbMemories={dbMemories}
            activeUserId={activeUserId}
            dbUsers={dbUsers}
            storyIndex={storyIndex}
          />
        )}
      </AnimatePresence>

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
      />

      {/* ---------------- NOTIFICATIONS TRAY ---------------- */}
      <NotificationsTrayModal
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        filteredNotifications={filteredNotifications}
        handleAcceptInviteFromNotif={handleAcceptInviteFromNotif}
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

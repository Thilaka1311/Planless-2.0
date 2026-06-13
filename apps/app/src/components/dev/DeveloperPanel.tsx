import React, { useEffect, useState } from "react";
import { DeveloperPanelSection } from "./DeveloperPanelSection";
import { usePlansStore } from "../../features/plans/state/PlansContext";
import { useCirclesStore } from "../../features/circles/state/CirclesContext";
import { useProfileStore } from "../../features/profile/state/ProfileContext";

export const DeveloperPanel: React.FC = () => {
  const {
    dbPlans,
    dbMemories,
    dbMemoryMovieVerdicts,
    dbMemoryRestaurantVotes,
    dbMemoryMatchResults,
    dbMemoryMvpVotes,
    dbPlanParticipants,
    plans,
    completePlan,
    cancelPlan,
    changePlanHost,
    refreshPlans
  } = usePlansStore();
  const { circles, dbCircleMembers } = useCirclesStore();
  const { dbUsers, activeUserUuid, activeUserId, setUserProfile, userProfile } = useProfileStore();
  const [selectedCircleIds, setSelectedCircleIds] = useState<string[]>([]);

  useEffect(() => {
    if (circles.length > 0 && selectedCircleIds.length === 0) {
      const firstUuid = circles[0].dbUuid || circles[0].id;
      if (firstUuid) {
        setSelectedCircleIds([firstUuid]);
      }
    }
  }, [circles, selectedCircleIds]);
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const getCurrentUserUuid = () => {
    const uuid = userProfile?.dbUuid;
    if (uuid && uuidRegex.test(uuid)) {
      return uuid;
    }
    return "";
  };
  const currentUserUuid = getCurrentUserUuid();

  const [notificationsCount, setNotificationsCount] = useState(0);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Auto-clear feedback after 3 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Fetch notifications count directly from DB
  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await fetch("/api/db/fetch-all?tables=notifications");
        if (res.ok) {
          const json = await res.json();
          setNotificationsCount(json.data?.notifications?.length || 0);
        }
      } catch (err) {
        console.error("Failed to fetch notifications for dev panel", err);
      }
    }
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  // Find users in dbUsers
  const findUserByQuery = (queries: string[]) => {
    return dbUsers.find(u => {
      const name = (u.full_name || "").toLowerCase();
      return queries.some(q => name.includes(q.toLowerCase()));
    });
  };

  const thilakUser = findUserByQuery(["thilak", "thilaka"]);
  const bhavyaUser = findUserByQuery(["bhavya", "bhaavya"]);
  const manastejUser = findUserByQuery(["manas", "maanas", "manastej"]);
  const renjithUser = findUserByQuery(["renjith", "renjit"]);

  const handleSwitchUser = async (userObj: any, nameLabel: string) => {
    if (!userObj) {
      setFeedback({ message: `${nameLabel} not found in Supabase`, type: "error" });
      return;
    }

    try {
      const updatedProfile = {
        name: userObj.full_name,
        phone: userObj.phone_number || "",
        bio: userObj.bio || "Always spontaneous, never planless.",
        avatar: userObj.profile_photo || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userObj.full_name || "UA")}&backgroundColor=ff8b66`,
        joined: true,
        college_or_work: userObj.college_or_work || "SRM Chennai",
        user_id: userObj.user_id,
        dbUuid: userObj.id,
      };

      setUserProfile(updatedProfile);
      setFeedback({ message: `Switched to ${userObj.full_name}`, type: "success" });
    } catch (err: any) {
      console.error(err);
      setFeedback({ message: `Failed to switch to ${nameLabel}`, type: "error" });
    }
  };

  const handleCreatePlan = async (type: "movie" | "dining" | "football" | "badminton", numInvitees: number) => {
    try {
      const currentUserUuid = getCurrentUserUuid();
      if (!currentUserUuid) {
        setFeedback({ message: "Developer Panel: No valid user UUID loaded", type: "error" });
        return;
      }

      let planUuid = "";
      const planId = `PLAN_DEV_${Date.now()}`;

      let title = "";
      let category = "";
      let activity_type = "";
      let location = "";

      const tomorrow7pm = new Date();
      tomorrow7pm.setDate(tomorrow7pm.getDate() + 1);
      tomorrow7pm.setHours(19, 0, 0, 0);
      let datetime = tomorrow7pm.toISOString();

      let split_amount = 0;
      let response_deadline_at: string | undefined = undefined;

      const activeCircleIds = selectedCircleIds.length > 0
        ? selectedCircleIds
        : (circles[0] ? [circles[0].dbUuid || circles[0].id] : []);

      if (activeCircleIds.length === 0) {
        setFeedback({ message: "Developer Panel: No target circle(s) selected", type: "error" });
        return;
      }
      const targetCircleId = activeCircleIds[0];

      if (type === "movie") {
        title = "[DEV] Movie Night";
        category = "movies";
        activity_type = null as any;
        location = "PVR IMAX";
        response_deadline_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      } else if (type === "dining") {
        title = "[DEV] Dinner";
        category = "dining";
        activity_type = null as any;
        location = "Olive Bistro";
      } else if (type === "football") {
        title = "[DEV] Football Match";
        category = "sports";
        activity_type = "football";
        location = "Matchday Arena";
      } else if (type === "badminton") {
        title = "[DEV] Badminton Session";
        category = "sports";
        activity_type = "badminton";
        location = "Badminton Hub";
      }

      const newDbPlan = {
        plan_id: planId,
        title,
        description: `Developer test ${type} plan`,
        created_by: currentUserUuid,
        host_id: currentUserUuid,
        circle_id: targetCircleId,
        activity_type,
        category,
        location,
        datetime,
        status: "active",
        created_at: new Date().toISOString(),
        waitlist_enabled: false,
        response_cutoff_hours: 0,
        response_deadline_at,
        split_amount
      };

      const planRes = await fetch("/api/db/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "plans", records: [newDbPlan] })
      });

      if (!planRes.ok) {
        const planErrText = await planRes.text();
        console.error("PLAN INSERT FAILURE", planErrText);
        let realErrorMessage = planErrText;
        try {
          const parsed = JSON.parse(planErrText);
          realErrorMessage = parsed.error || parsed.message || planErrText;
        } catch (e) { }
        throw new Error("Plan insert failed: " + realErrorMessage);
      }

      const planResJson = await planRes.json();
      if (!planResJson.success || !planResJson.data || planResJson.data.length === 0) {
        throw new Error("Plan insert failed: " + (planResJson.error || "No data returned"));
      }

      planUuid = planResJson.data[0].id;

      const participantRecords = [];
      participantRecords.push({
        participant_id: `PP_DEV_${Date.now()}_host`,
        plan_id: planUuid,
        user_id: currentUserUuid,
        status: "going",
        payment_status: "paid",
        joined_at: new Date().toISOString()
      });

      // Extract all user UUIDs belonging to selected target circles
      const memberUserUuids = dbCircleMembers
        .filter(cm => cm.circle_id && activeCircleIds.includes(cm.circle_id))
        .map(cm => cm.user_id)
        .filter(Boolean);

      const uniqueMemberUuids = [...new Set(memberUserUuids)];
      const inviteeUuids = uniqueMemberUuids.filter(uuid => uuid !== currentUserUuid);

      inviteeUuids.forEach((userId, idx) => {
        participantRecords.push({
          participant_id: `PP_DEV_${Date.now()}_invitee_${idx}`,
          plan_id: planUuid,
          user_id: userId,
          status: "going",
          payment_status: "unpaid",
          joined_at: new Date().toISOString()
        });
      });

      const validParticipantRecords = participantRecords.filter(
        rec => rec.user_id && uuidRegex.test(rec.user_id) && rec.plan_id && uuidRegex.test(rec.plan_id)
      );

      console.log("PLAN CREATED", planUuid);
      console.log("PARTICIPANT PAYLOAD", participantRecords);
      console.log("participant count", participantRecords.length);
      console.log("plan UUID", planUuid);
      console.log("host UUID", currentUserUuid);
      console.log("invitee UUIDs", inviteeUuids);
      console.log("VALID PARTICIPANT PAYLOAD", validParticipantRecords);

      let partRes;
      try {
        partRes = await fetch("/api/db/upsert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: "plan_participants", records: validParticipantRecords })
        });

        console.log("PARTICIPANT INSERT STATUS", partRes.status);
        const resText = await partRes.text();
        console.log("PARTICIPANT INSERT BODY", resText);

        if (!partRes.ok) {
          let errData = {};
          try { errData = JSON.parse(resText); } catch (e) { }
          console.error("SUPABASE ERROR DETAILS", errData);
          throw new Error("Failed to insert participants: " + resText);
        }
      } catch (error) {
        console.error("PARTICIPANT INSERT ERROR", error);
        throw error;
      }

      const inviteNotifications = inviteeUuids
        .filter((userId): userId is string => !!userId && typeof userId === "string" && uuidRegex.test(userId))
        .map(userId => ({
          user_id: userId,
          type: "PLAN_INVITATION",
          title: `[DEV] Invitation to "${title}"`,
          body: "Developer test plan invitation",
          reference_id: planUuid,
          is_read: false,
          created_at: new Date().toISOString()
        }));

      if (inviteNotifications.length > 0) {
        await fetch("/api/db/upsert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: "notifications", records: inviteNotifications })
        });
      }

      await refreshPlans();
      setFeedback({ message: `Created "${title}" successfully`, type: "success" });
    } catch (err: any) {
      console.error(err);
      setFeedback({ message: err.message || "Failed to create plan", type: "error" });
    }
  };

  const handleCompleteLatestPlan = async () => {
    try {
      const currentUserUuid = getCurrentUserUuid();
      if (!currentUserUuid) {
        throw new Error("Developer Panel: No valid user UUID loaded");
      }

      const devPlans = plans.filter(
        p => p.title.startsWith("[DEV]") && ["active", "going", "upcoming"].includes(p.status) && (p.hostId === currentUserUuid || p.hostId === activeUserId || p.creatorId === currentUserUuid || p.creatorId === activeUserId)
      );
      if (devPlans.length === 0) {
        throw new Error(`No active dev plans hosted by you found (searched ${plans.length} plans, statuses: ${[...new Set(plans.filter(p => p.title.startsWith("[DEV]")).map(p => p.status))].join(", ") || "none"})`);
      }
      const latestPlan = [...devPlans].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];

      console.log("COMPLETE_BUTTON_CLICKED", {
        source: "DeveloperPanel",
        planId: latestPlan.id,
        planDbUuid: latestPlan.dbUuid,
        planStatus: latestPlan.status,
        argPassedToCompletePlan: latestPlan.dbUuid || latestPlan.id,
      });
      await completePlan(latestPlan.dbUuid || latestPlan.id);
      setFeedback({ message: `Completed "${latestPlan.title}" successfully`, type: "success" });
    } catch (err: any) {
      console.error(err);
      setFeedback({ message: err.message || "Failed to complete latest plan", type: "error" });
    }
  };

  const handleCancelLatestPlan = async () => {
    try {
      const currentUserUuid = getCurrentUserUuid();
      if (!currentUserUuid) {
        throw new Error("Developer Panel: No valid user UUID loaded");
      }

      const devPlans = plans.filter(
        p => p.title.startsWith("[DEV]") && ["active", "going", "upcoming"].includes(p.status) && (p.hostId === currentUserUuid || p.hostId === activeUserId || p.creatorId === currentUserUuid || p.creatorId === activeUserId)
      );
      if (devPlans.length === 0) {
        throw new Error(`No active dev plans hosted by you found (searched ${plans.length} plans, statuses: ${[...new Set(plans.filter(p => p.title.startsWith("[DEV]")).map(p => p.status))].join(", ") || "none"})`);
      }
      const latestPlan = [...devPlans].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];

      await cancelPlan(latestPlan.dbUuid || latestPlan.id);
      setFeedback({ message: `Cancelled "${latestPlan.title}" successfully`, type: "success" });
    } catch (err: any) {
      console.error(err);
      setFeedback({ message: err.message || "Failed to cancel latest plan", type: "error" });
    }
  };

  const handleTransferHost = async () => {
    try {
      const currentUserUuid = getCurrentUserUuid();
      if (!currentUserUuid) {
        throw new Error("Developer Panel: No valid user UUID loaded");
      }

      const devPlans = plans.filter(
        p => p.title.startsWith("[DEV]") && ["active", "going", "upcoming"].includes(p.status) && (p.hostId === currentUserUuid || p.hostId === activeUserId || p.creatorId === currentUserUuid || p.creatorId === activeUserId)
      );
      if (devPlans.length === 0) {
        throw new Error(`No active dev plans hosted by you found (searched ${plans.length} plans, statuses: ${[...new Set(plans.filter(p => p.title.startsWith("[DEV]")).map(p => p.status))].join(", ") || "none"})`);
      }
      const latestPlan = [...devPlans].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];

      const eligibleParticipants = latestPlan.members.filter(
        (m: any) => m.userId !== currentUserUuid && m.userId !== activeUserId && m.joinState !== "skipped" && m.joinState !== "passed"
      );
      if (eligibleParticipants.length === 0) {
        throw new Error("No eligible participants to transfer ownership to");
      }

      const firstParticipant = eligibleParticipants[0];
      await changePlanHost(latestPlan.dbUuid || latestPlan.id, firstParticipant.userId, currentUserUuid);
      setFeedback({ message: `Transferred "${latestPlan.title}" ownership to ${firstParticipant.name}`, type: "success" });
    } catch (err: any) {
      console.error(err);
      setFeedback({ message: err.message || "Failed to transfer host", type: "error" });
    }
  };

  const handleAction = (actionName: string) => {
    console.log(`[DeveloperPanel] Action clicked: ${actionName}`);
    setFeedback({ message: `Placeholder: ${actionName}`, type: "success" });
  };

  return (
    <div
      id="dev_testing_panel"
      className="w-full lg:w-80 shrink-0 flex flex-col gap-4 max-h-[780px] overflow-y-auto pr-1 text-left font-sans select-none"
    >
      <div className="flex items-center gap-2 px-1 py-2 border-b border-zinc-800">
        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <h2 className="text-xs font-sans font-black uppercase tracking-widest text-zinc-200">
          Developer Tools
        </h2>
      </div>

      {feedback && (
        <div className={`px-3 py-2 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider border ${feedback.type === "success"
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            : "bg-rose-500/10 border-rose-500/30 text-rose-400"
          }`}>
          {feedback.message}
        </div>
      )}

      {/* Section 1: Plan Tools */}
      <DeveloperPanelSection title="Plan Tools">
        {/* Target Circle Selector */}
        <div className="space-y-1 mb-3">
          <label className="text-[8px] font-mono text-zinc-500 uppercase tracking-wider block font-bold">Target Circles</label>
          <div className="flex flex-col gap-1.5 bg-zinc-950/50 p-2 rounded-xl border border-zinc-900 max-h-28 overflow-y-auto">
            {circles.map(c => {
              const cId = c.dbUuid || c.id;
              const isSelected = selectedCircleIds.includes(cId);
              return (
                <label key={cId} className="flex items-center gap-2 text-[9px] font-sans text-zinc-300 cursor-pointer hover:text-white select-none">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCircleIds(prev => [...prev, cId]);
                      } else {
                        if (selectedCircleIds.length > 1) {
                          setSelectedCircleIds(prev => prev.filter(id => id !== cId));
                        }
                      }
                    }}
                    className="accent-brand-orange"
                  />
                  <span className="truncate">{c.name}</span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleCreatePlan("movie", 2)}
            className="px-2 py-1.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 text-[9px] font-mono font-bold uppercase tracking-wider transition-all active:scale-[0.97] cursor-pointer text-left truncate"
          >
            Movie Plan
          </button>
          <button
            onClick={() => handleCreatePlan("dining", 2)}
            className="px-2 py-1.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 text-[9px] font-mono font-bold uppercase tracking-wider transition-all active:scale-[0.97] cursor-pointer text-left truncate"
          >
            Dining Plan
          </button>
          <button
            onClick={() => handleCreatePlan("football", 10)}
            className="px-2 py-1.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 text-[9px] font-mono font-bold uppercase tracking-wider transition-all active:scale-[0.97] cursor-pointer text-left truncate"
          >
            Football Plan
          </button>
          <button
            onClick={() => handleCreatePlan("badminton", 4)}
            className="px-2 py-1.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 text-[9px] font-mono font-bold uppercase tracking-wider transition-all active:scale-[0.97] cursor-pointer text-left truncate"
          >
            Badminton Plan
          </button>
        </div>
        <button
          onClick={handleCompleteLatestPlan}
          className="w-full px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 text-[9px] font-mono font-bold uppercase tracking-wider transition-all active:scale-[0.97] cursor-pointer text-center"
        >
          Complete Latest Plan
        </button>
        <button
          onClick={handleCancelLatestPlan}
          className="w-full px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:border-rose-950 hover:bg-rose-950/10 text-zinc-300 hover:text-rose-400 text-[9px] font-mono font-bold uppercase tracking-wider transition-all active:scale-[0.97] cursor-pointer text-center"
        >
          Cancel Latest Plan
        </button>
        <button
          onClick={handleTransferHost}
          className="w-full px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 text-[9px] font-mono font-bold uppercase tracking-wider transition-all active:scale-[0.97] cursor-pointer text-center"
        >
          Transfer Host
        </button>
      </DeveloperPanelSection>

      {/* Section 2: Notification Tools */}
      <DeveloperPanelSection title="Notification Tools">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleAction("Create Invitation")}
            className="px-2 py-1.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 text-[9px] font-mono font-bold uppercase tracking-wider transition-all active:scale-[0.97] cursor-pointer text-left truncate"
          >
            Invitation
          </button>
          <button
            onClick={() => handleAction("Create Waitlist Promotion")}
            className="px-2 py-1.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 text-[9px] font-mono font-bold uppercase tracking-wider transition-all active:scale-[0.97] cursor-pointer text-left truncate"
          >
            Promotion
          </button>
          <button
            onClick={() => handleAction("Create Plan Updated")}
            className="px-2 py-1.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 text-[9px] font-mono font-bold uppercase tracking-wider transition-all active:scale-[0.97] cursor-pointer text-left truncate"
          >
            Plan Updated
          </button>
          <button
            onClick={() => handleAction("Create Plan Cancelled")}
            className="px-2 py-1.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:border-rose-950 hover:bg-rose-950/10 text-zinc-300 hover:text-rose-400 text-[9px] font-mono font-bold uppercase tracking-wider transition-all active:scale-[0.97] cursor-pointer text-left truncate"
          >
            Cancelled
          </button>
        </div>
        <button
          onClick={() => handleAction("Create Host Transfer")}
          className="w-full px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 text-[9px] font-mono font-bold uppercase tracking-wider transition-all active:scale-[0.97] cursor-pointer text-center"
        >
          Host Transfer
        </button>
      </DeveloperPanelSection>

      {/* Section 3: Memory Tools */}
      <DeveloperPanelSection title="Memory Tools">
        <div className="grid grid-cols-1 gap-2">
          <button
            onClick={() => handleAction("Create Pending Movie Memory")}
            className="px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 text-[9px] font-mono font-bold uppercase tracking-wider transition-all active:scale-[0.97] cursor-pointer text-left truncate"
          >
            Pending Movie Memory
          </button>
          <button
            onClick={() => handleAction("Create Rated Movie Memory")}
            className="px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 text-[9px] font-mono font-bold uppercase tracking-wider transition-all active:scale-[0.97] cursor-pointer text-left truncate"
          >
            Rated Movie Memory
          </button>
          <button
            onClick={() => handleAction("Create Football Memory")}
            className="px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 text-[9px] font-mono font-bold uppercase tracking-wider transition-all active:scale-[0.97] cursor-pointer text-left truncate"
          >
            Football Memory
          </button>
          <button
            onClick={() => handleAction("Create Expired Memory")}
            className="px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 text-[9px] font-mono font-bold uppercase tracking-wider transition-all active:scale-[0.97] cursor-pointer text-left truncate"
          >
            Expired Memory
          </button>
        </div>
      </DeveloperPanelSection>

      {/* Section 4: Environment Tools */}
      <DeveloperPanelSection title="Environment Tools">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleAction("Clear Plans")}
            className="px-2 py-1.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:border-rose-950 hover:bg-rose-950/10 text-zinc-300 hover:text-rose-400 text-[9px] font-mono font-bold uppercase tracking-wider transition-all active:scale-[0.97] cursor-pointer text-center truncate"
          >
            Clear Plans
          </button>
          <button
            onClick={() => handleAction("Clear Memories")}
            className="px-2 py-1.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:border-rose-950 hover:bg-rose-950/10 text-zinc-300 hover:text-rose-400 text-[9px] font-mono font-bold uppercase tracking-wider transition-all active:scale-[0.97] cursor-pointer text-center truncate"
          >
            Clear Memories
          </button>
          <button
            onClick={() => handleAction("Clear Notifications")}
            className="px-2 py-1.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:border-rose-950 hover:bg-rose-950/10 text-zinc-300 hover:text-rose-400 text-[9px] font-mono font-bold uppercase tracking-wider transition-all active:scale-[0.97] cursor-pointer text-center truncate"
          >
            Clear Notifs
          </button>
          <button
            onClick={() => handleAction("Reset Everything")}
            className="px-2 py-1.5 rounded-xl bg-rose-950/20 border border-rose-900/40 hover:border-rose-700 text-rose-400 hover:text-rose-300 text-[9px] font-mono font-black uppercase tracking-wider transition-all active:scale-[0.97] cursor-pointer text-center truncate"
          >
            Reset All
          </button>
        </div>
      </DeveloperPanelSection>

      {/* Section 5: User Tools */}
      <DeveloperPanelSection title="User Tools">
        <div className="text-[10px] font-mono text-zinc-400 mb-1">
          Current User:{" "}
          <span className="text-emerald-400 font-bold">
            ● {userProfile?.name || "None"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: "Thilak Sundar", user: thilakUser, label: "Thilak Sundar" },
            { key: "Bhavya", user: bhavyaUser, label: "Bhavya" },
            { key: "Manastej", user: manastejUser, label: "Manastej" },
            { key: "Renjith", user: renjithUser, label: "Renjith" }
          ].map((item) => {
            const isMissing = !item.user;
            const isActive = item.user && item.user.id === currentUserUuid;
            return (
              <button
                key={item.key}
                disabled={isMissing}
                onClick={() => handleSwitchUser(item.user, item.label)}
                className={`px-2 py-1.5 rounded-xl border text-[9px] font-mono font-bold uppercase tracking-wider transition-all active:scale-[0.97] cursor-pointer text-center truncate ${isMissing
                    ? "bg-zinc-950/20 border-zinc-900 text-zinc-600 cursor-not-allowed"
                    : isActive
                      ? "bg-emerald-950/30 border-emerald-500/50 text-emerald-400 font-black shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                      : "bg-zinc-900 border-zinc-850 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100"
                  }`}
              >
                {isMissing ? "User Missing" : item.label}
              </button>
            );
          })}
        </div>
      </DeveloperPanelSection>

      {/* Section 6: System Status */}
      <DeveloperPanelSection title="System Status">
        <div className="space-y-1 text-[9px] font-mono text-zinc-400">
          <div className="flex justify-between">
            <span>Plans Count:</span>
            <span className="text-zinc-200 font-bold">{dbPlans.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Notifications Count:</span>
            <span className="text-zinc-200 font-bold">{notificationsCount}</span>
          </div>
          <div className="flex justify-between">
            <span>Memories Count:</span>
            <span className="text-zinc-200 font-bold">{dbMemories.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Movie Verdicts Count:</span>
            <span className="text-zinc-200 font-bold">{dbMemoryMovieVerdicts.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Restaurant Votes Count:</span>
            <span className="text-zinc-200 font-bold">{dbMemoryRestaurantVotes.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Match Results Count:</span>
            <span className="text-zinc-200 font-bold">{dbMemoryMatchResults.length}</span>
          </div>
          <div className="flex justify-between">
            <span>MVP Votes Count:</span>
            <span className="text-zinc-200 font-bold">{dbMemoryMvpVotes.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Circle Count:</span>
            <span className="text-zinc-200 font-bold">{circles?.length || 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Participants Count:</span>
            <span className="text-zinc-200 font-bold">{dbPlanParticipants.length}</span>
          </div>
        </div>
      </DeveloperPanelSection>
    </div>
  );
};

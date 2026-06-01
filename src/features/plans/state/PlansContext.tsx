import React, { createContext, useContext, useState, ReactNode } from "react";
import { Plan, PlanMember, DbPlan, DbPlanParticipant, DbMemory, User } from "../../../core/types";
import { useProfileStore } from "../../profile/state/ProfileContext";
import { useCirclesStore } from "../../circles/state/CirclesContext";
import { insertParticipant, updateParticipantStatus, insertPlanReminder, syncUserStats } from "../../../lib/db";
import { mapPlansToLegacyPlans } from "../../../lib/mappers";

interface ParticipantCounts {
  host: number;
  going: number;
  waitlist: number;
  delivered: number;
  seen: number;
  passed: number;
  pending: number;  // delivered + seen (invited but not yet responded)
  total: number;
}

interface PlansContextType {
  plans: Plan[];
  setPlans: React.Dispatch<React.SetStateAction<Plan[]>>;
  dbPlans: DbPlan[];
  setDbPlans: React.Dispatch<React.SetStateAction<DbPlan[]>>;
  dbPlanParticipants: DbPlanParticipant[];
  setDbPlanParticipants: React.Dispatch<React.SetStateAction<DbPlanParticipant[]>>;
  dbMemories: any[];
  setDbMemories: React.Dispatch<React.SetStateAction<any[]>>;
  createPlan: (plan: DbPlan, invitees: string[]) => Promise<any>;
  joinPlan: (planId: string, userProfile: any) => Promise<void>;
  leavePlan: (planId: string, leaverId: string) => Promise<void>;
  passPlan: (planId: string, passerId: string) => Promise<void>;
  waitlistPlan: (planId: string, userProfile: any) => Promise<void>;
  sendReminder: (planId: string, userId: string) => void;
  ignoreReminder: (planId: string, ignoreUserId: string) => void;
  getHomeFeedPlans: (userId: string) => Plan[];
  getHubPlans: (userId: string) => Plan[];
  getParticipantCounts: (planId: string) => ParticipantCounts;
}

const PlansContext = createContext<PlansContextType | undefined>(undefined);

export const PlansProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [dbPlans, setDbPlans] = useState<DbPlan[]>([]);
  const [dbPlanParticipants, setDbPlanParticipants] = useState<DbPlanParticipant[]>([]);
  const [dbMemories, setDbMemories] = useState<any[]>([]);

  const { activeUserId: userId, dbUsers } = useProfileStore();

  const resolveUserUuid = (uId: string) => {
    const userObj = dbUsers.find(u => u.user_id === uId || u.id === uId);
    return userObj ? userObj.id : uId;
  };

  const refreshPlans = async () => {
    try {
      const res = await fetch("/api/db/fetch-all");
      if (res.ok) {
        const json = await res.json();
        if (json.configured && !json.tables_missing) {
          const d = json.data || {};
          setDbPlans(d.plans || []);
          setDbPlanParticipants(d.plan_participants || []);
          setDbMemories(d.memories || []);
          setPlans(mapPlansToLegacyPlans(d.plans || [], d.plan_participants || [], d.users || [], userId));
          console.log(`[PlansContext refreshPlans] Successfully refreshed plans state. Count: ${d.plans?.length}, Participants: ${d.plan_participants?.length}`);
        }
      }
    } catch (err) {
      console.error("[PlansContext refreshPlans] Failed to fetch updated state:", err);
    }
  };

  const joinPlan = async (planId: string, userProfile: any) => {
    const matchedPlan = plans.find(p => p.id === planId);
    const planUuid = matchedPlan?.dbUuid || planId;
    const userUuid = userProfile.dbUuid || resolveUserUuid(userProfile.user_id || userId);

    // Logging: status before action
    const existingBefore = dbPlanParticipants.find(p => (p.plan_id === planUuid || p.plan_id === planId) && (p.user_id === userUuid || p.user_id === userProfile.user_id));
    console.log(`[PlansContext] JOIN ACTION START for Plan: ${matchedPlan?.title || planId}, User: ${userProfile.name}`);
    console.log(`[PlansContext] Participant status BEFORE action:`, existingBefore ? existingBefore.status : "none (not invited/joined)");

    // 1. Update UI plans state locally for immediate response
    setPlans(prevPlans => prevPlans.map(plan => {
      if (plan.id === planId) {
        const alreadyJoined = plan.members.some(u => u.userId === userProfile.user_id && (u.joinState === "going" || u.joinState === "host"));
        if (alreadyJoined) {
          console.log(`[PlansContext] User already joined or host. Skipping local UI update.`);
          return plan;
        }

        const activeMembersCount = plan.members.filter(u => u.joinState === "going" || u.joinState === "host").length;
        const targetJoinState = (plan.waitlistEnabled && activeMembersCount > (plan.joinLimit || 0)) ? "waitlist" : "going";

        console.log(`[PlansContext Local UI Update]`);
        console.log(`- Plan title: "${plan.title}"`);
        console.log(`- waitlistEnabled: ${plan.waitlistEnabled}`);
        console.log(`- joinLimit: ${plan.joinLimit}`);
        console.log(`- active participant count (host + going): ${activeMembersCount}`);
        console.log(`- waitlist decision result: ${targetJoinState}`);

        const newMember: PlanMember = {
          userId: userProfile.user_id || userId,
          name: userProfile.name,
          avatar: userProfile.avatar,
          joinState: targetJoinState,
          reminderState: "none",
          joinedAt: new Date().toISOString(),
          checkedIn: targetJoinState === "going" && matchedPlan && matchedPlan.cost > 0
        };

        const newMembersList = [...plan.members.filter(m => m.userId !== newMember.userId), newMember];
        const newJoinedCount = newMembersList.filter(m => m.joinState === "going" || m.joinState === "host").length;
        const currentCapacity = plan.waitlistEnabled && plan.joinLimit ? plan.joinLimit : (plan.capacity || 10);
        const progressPct = currentCapacity > 0 ? Math.round((newJoinedCount / currentCapacity) * 100) : 0;

        return {
          ...plan,
          members: newMembersList,
          joinedUsers: newMembersList,
          confirmedCount: newJoinedCount
        };
      }
      return plan;
    }));

    // 2. Database Persistence
    if (planUuid && userUuid) {
      if (existingBefore && existingBefore.status === "host") {
        console.log(`[PlansContext] User is host. Skipping database participant status overwrite.`);
        return;
      }

      const acceptedCount = dbPlanParticipants.filter(
        pp => (pp.plan_id === planUuid || pp.plan_id === planId) &&
              (pp.status === "going" || pp.status === "host")
      ).length;
      
      // If activeParticipants <= joinLimit, status is "going", else "waitlist"
      const limit = matchedPlan?.joinLimit || 0;
      const targetDbState = (matchedPlan?.waitlistEnabled && acceptedCount > limit) ? "waitlist" : "going";

      console.log(`[PlansContext DB Write Audit]`);
      console.log(`- joinLimit: ${limit}`);
      console.log(`- active participant count: ${acceptedCount}`);
      console.log(`- participant status before accept: ${existingBefore?.status || "none"}`);
      console.log(`- participant status after accept: ${targetDbState}`);
      console.log(`- waitlist decision result: ${targetDbState}`);

      if (existingBefore && existingBefore.id) {
        await updateParticipantStatus(existingBefore.id, targetDbState, targetDbState === "going" && matchedPlan && matchedPlan.cost > 0 ? "paid" : "unpaid");
      } else {
        await insertParticipant({
          plan_id: planUuid,
          user_id: userUuid,
          status: targetDbState,
          payment_status: targetDbState === "going" && matchedPlan && matchedPlan.cost > 0 ? "paid" : "unpaid",
          joined_at: new Date().toISOString()
        });
      }
      await syncUserStats(userUuid, "join_plan");
    }

    // 3. Sync state from DB
    await refreshPlans();

    // Logging: status after action
    const refSnapshot = await fetch("/api/db/fetch-all").then(r => r.json()).catch(() => null);
    const existingAfter = refSnapshot?.data?.plan_participants?.find((p: any) => p.plan_id === planUuid && p.user_id === userUuid);
    console.log(`[PlansContext] Participant status AFTER action & DB refresh:`, existingAfter ? existingAfter.status : "none");
  };

  const waitlistPlan = async (planId: string, userProfile: any) => {
    const matchedPlan = plans.find(p => p.id === planId);
    const planUuid = matchedPlan?.dbUuid || planId;
    const userUuid = userProfile.dbUuid || resolveUserUuid(userProfile.user_id || userId);

    const existingBefore = dbPlanParticipants.find(p => (p.plan_id === planUuid || p.plan_id === planId) && (p.user_id === userUuid || p.user_id === userProfile.user_id));
    console.log(`[PlansContext] WAITLIST ACTION START for Plan: ${matchedPlan?.title || planId}, User: ${userProfile.name}`);
    console.log(`[PlansContext] Participant status BEFORE action:`, existingBefore ? existingBefore.status : "none");

    // 1. Update UI plans state locally
    setPlans(prevPlans => prevPlans.map(plan => {
      if (plan.id === planId) {
        const alreadyWaitlisted = plan.members.some(u => u.userId === userProfile.user_id && u.joinState === "waitlist");
        if (alreadyWaitlisted) return plan;

        const newMember: PlanMember = {
          userId: userProfile.user_id || userId,
          name: userProfile.name,
          avatar: userProfile.avatar,
          joinState: "waitlist",
          reminderState: "none",
          joinedAt: new Date().toISOString()
        };

        const newMembersList = [...plan.members.filter(m => m.userId !== newMember.userId), newMember];

        return {
          ...plan,
          members: newMembersList,
          joinedUsers: newMembersList,
          waitlistUsers: newMembersList.filter(m => m.joinState === "waitlist")
        };
      }
      return plan;
    }));

    // 2. Database Persistence
    if (planUuid && userUuid) {
      if (existingBefore && existingBefore.id) {
        await updateParticipantStatus(existingBefore.id, "waitlist", "unpaid");
      } else {
        await insertParticipant({
          plan_id: planUuid,
          user_id: userUuid,
          status: "waitlist",
          payment_status: "unpaid",
          joined_at: new Date().toISOString()
        });
      }
    }

    // 3. Sync state from DB
    await refreshPlans();

    // Logging: status after action
    const refSnapshot = await fetch("/api/db/fetch-all").then(r => r.json()).catch(() => null);
    const existingAfter = refSnapshot?.data?.plan_participants?.find((p: any) => p.plan_id === planUuid && p.user_id === userUuid);
    console.log(`[PlansContext] Participant status AFTER action & DB refresh:`, existingAfter ? existingAfter.status : "none");
  };

  const leavePlan = async (planId: string, leaverId: string) => {
    const matchedPlan = plans.find(p => p.id === planId);
    const planUuid = matchedPlan?.dbUuid || planId;
    const userUuid = resolveUserUuid(leaverId);

    const existingBefore = dbPlanParticipants.find(p => (p.plan_id === planUuid || p.plan_id === planId) && (p.user_id === userUuid || p.user_id === leaverId));
    console.log(`[PlansContext] LEAVE ACTION START for Plan: ${matchedPlan?.title || planId}, User: ${leaverId}`);
    console.log(`[PlansContext] Participant status BEFORE action:`, existingBefore ? existingBefore.status : "none");

    // 1. Update UI plans state locally
    setPlans(prevPlans => prevPlans.map(plan => {
      if (plan.id === planId) {
        const newMembersList = plan.members.filter(u => u.userId !== leaverId);
        return {
          ...plan,
          members: newMembersList,
          joinedUsers: newMembersList,
          confirmedCount: newMembersList.filter(m => m.joinState === "going").length
        };
      }
      return plan;
    }));

    // 2. Database Persistence
    if (planUuid && userUuid && existingBefore && existingBefore.id) {
      await fetch("/api/db/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "plan_participants", match: { id: existingBefore.id } })
      }).catch(err => console.error("Failed to delete participant:", err));
    }

    // 3. Sync state from DB
    await refreshPlans();

    // Logging: status after action
    const refSnapshot = await fetch("/api/db/fetch-all").then(r => r.json()).catch(() => null);
    const existingAfter = refSnapshot?.data?.plan_participants?.find((p: any) => p.plan_id === planUuid && p.user_id === userUuid);
    console.log(`[PlansContext] Participant status AFTER action & DB refresh:`, existingAfter ? existingAfter.status : "none");
  };

  const passPlan = async (planId: string, passerId: string) => {
    const matchedPlan = plans.find(p => p.id === planId);
    const planUuid = matchedPlan?.dbUuid || planId;
    const userUuid = resolveUserUuid(passerId);

    const existingBefore = dbPlanParticipants.find(p => (p.plan_id === planUuid || p.plan_id === planId) && (p.user_id === userUuid || p.user_id === passerId));
    console.log(`[PlansContext] PASS ACTION START for Plan: ${matchedPlan?.title || planId}, User: ${passerId}`);
    console.log(`[PlansContext] Participant status BEFORE action:`, existingBefore ? existingBefore.status : "none");

    // 1. Update UI plans state locally
    setPlans(prevPlans => prevPlans.map(plan => {
      if (plan.id === planId) {
        const newMembersList = plan.members.map(u =>
          u.userId === passerId ? { ...u, joinState: "skipped" as const } : u
        );
        return {
          ...plan,
          members: newMembersList,
          joinedUsers: newMembersList.filter(m => m.joinState !== "passed" && m.joinState !== "skipped"),
          confirmedCount: newMembersList.filter(m => m.joinState === "going").length
        };
      }
      return plan;
    }));

    // 2. Database Persistence
    if (planUuid && userUuid) {
      if (existingBefore && existingBefore.id) {
        await updateParticipantStatus(existingBefore.id, "passed", "unpaid");
      } else {
        await insertParticipant({
          plan_id: planUuid,
          user_id: userUuid,
          status: "passed",
          payment_status: "unpaid",
          joined_at: new Date().toISOString()
        });
      }
    }

    // 3. Sync state from DB
    await refreshPlans();

    // Logging: status after action
    const refSnapshot = await fetch("/api/db/fetch-all").then(r => r.json()).catch(() => null);
    const existingAfter = refSnapshot?.data?.plan_participants?.find((p: any) => p.plan_id === planUuid && p.user_id === userUuid);
    console.log(`[PlansContext] Participant status AFTER action & DB refresh:`, existingAfter ? existingAfter.status : "none");
  };

  // Reminder System
  const sendReminder = (planId: string, targetUserId: string) => {
    setPlans(prevPlans => prevPlans.map(plan => {
      if (plan.id === planId) {
        const newMembersList = plan.members.map(u =>
          u.userId === targetUserId ? { ...u, reminderState: "sent" as const } : u
        );
        return {
          ...plan,
          members: newMembersList,
          joinedUsers: newMembersList.filter(m => m.joinState !== "passed")
        };
      }
      return plan;
    }));

    // Database Persistence
    const matchedPlan = plans.find(p => p.id === planId);
    const planUuid = matchedPlan?.dbUuid;
    const senderUuid = resolveUserUuid(userId);

    if (planUuid && senderUuid) {
      insertPlanReminder({
        plan_id: planUuid,
        sent_by: senderUuid
      });
    }
  };

  const ignoreReminder = (planId: string, ignoreUserId: string) => {
    passPlan(planId, ignoreUserId);
  };

  /**
   * Returns DB-accurate participant counts for a plan.
   * planUuid can be either the UUID id or the short plan_id —
   * we match against both to handle legacy data.
   */
  const getParticipantCounts = (planUuid: string): ParticipantCounts => {
    const rows = dbPlanParticipants.filter(
      pp => pp.plan_id === planUuid || (pp as any).id === planUuid
    );

    const host      = rows.filter(r => r.status === "host").length;
    const going     = rows.filter(r => r.status === "going").length;
    const waitlist  = rows.filter(r => r.status === "waitlist").length;
    const delivered = rows.filter(r => r.status === "delivered").length;
    const seen      = rows.filter(r => r.status === "seen").length;
    const passed    = rows.filter(r => r.status === "passed" || r.status === "skipped").length;
    const pending   = delivered + seen;
    const total     = rows.length;

    const joinedCountVal = host + going;
    console.log(`[getParticipantCounts] PlanUuid: ${planUuid}`);
    console.log(`[getParticipantCounts] DB raw participants count: ${rows.length}`);
    console.log(`[getParticipantCounts] breakdown - host: ${host}, going: ${going}, waitlist: ${waitlist}, delivered: ${delivered}, seen: ${seen}, passed: ${passed}, pending: ${pending}`);
    console.log(`[getParticipantCounts] Joined count calculation (host + going): ${joinedCountVal}`);

    return { host, going, waitlist, delivered, seen, passed, pending, total };
  };

  const getHomeFeedPlans = (userId: string) => {
    // userId may be either the short user_id ("U001") or UUID
    const filtered = plans.filter(plan => {
      const member = plan.members.find(
        m => m.userId === userId || (m as any).userUuid === userId
      );
      const state = member?.joinState;

      const isIncluded = state && ["delivered", "seen"].includes(state);

      if (isIncluded) {
        console.log(`[PlansContext getHomeFeedPlans INCLUDED] Current User ID: ${userId}, Plan: "${plan.title}", Status: ${state}`);
      } else {
        console.log(`[PlansContext getHomeFeedPlans EXCLUDED] Current User ID: ${userId}, Plan: "${plan.title}", Status: ${state || "none"}`);
      }

      return !!isIncluded;
    });

    console.log(`[PlansContext getHomeFeedPlans] Current User: ${userId}, Visible Count: ${filtered.length}, Plans:`, filtered.map(p => p.title));

    const getTimelineSectionValue = (p: Plan) => {
      const dt = p.date.toUpperCase();
      if (dt.includes("TODAY")) return 1;
      if (dt.includes("TOMORROW")) return 2;
      return 3;
    };

    const getDayIndexValue = (dateStr: string) => {
      const d = dateStr.toUpperCase();
      if (d.includes("MON")) return 1;
      if (d.includes("TUE")) return 2;
      if (d.includes("WED")) return 3;
      if (d.includes("THU")) return 4;
      if (d.includes("FRI")) return 5;
      if (d.includes("SAT")) return 6;
      if (d.includes("SUN")) return 7;
      return 8;
    };

    const parseTimeToMinutesValue = (timeStr: string) => {
      if (!timeStr) return 0;
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return 0;
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const ampm = match[3].toUpperCase();
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    return filtered.sort((a, b) => {
      const secA = getTimelineSectionValue(a);
      const secB = getTimelineSectionValue(b);
      if (secA !== secB) return secA - secB;

      const dayA = getDayIndexValue(a.date);
      const dayB = getDayIndexValue(b.date);
      if (dayA !== dayB) return dayA - dayB;

      return parseTimeToMinutesValue(a.time) - parseTimeToMinutesValue(b.time);
    });
  };

  const getHubPlans = (userIdStr: string) => {
    // Show all plans where user is a participant (host or going) — for the Plans hub tab
    return plans.filter(plan => {
      if (plan.hostId === "u_self") return true; // hosted by logged-in user
      const member = plan.members.find(
        m => m.userId === userIdStr || (m as any).userUuid === userIdStr
      );
      return member?.joinState === "going" || member?.joinState === "host";
    });
  };

  return (
    <PlansContext.Provider value={{ 
      plans, setPlans, 
      dbPlans, setDbPlans, 
      dbPlanParticipants, setDbPlanParticipants,
      dbMemories, setDbMemories,
      joinPlan, leavePlan, passPlan, waitlistPlan, sendReminder, ignoreReminder, getHomeFeedPlans, getHubPlans, getParticipantCounts 
    }}>
      {children}
    </PlansContext.Provider>
  );
};

export const usePlansStore = () => {
  const context = useContext(PlansContext);
  if (context === undefined) {
    throw new Error("usePlansStore must be used within a PlansProvider");
  }
  return context;
};

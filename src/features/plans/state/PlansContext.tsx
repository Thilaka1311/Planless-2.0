import React, { createContext, useContext, useState, ReactNode } from "react";
import { Plan, PlanMember, DbPlan, DbPlanParticipant, DbMemory, User } from "../../../core/types";
import { mapPlansToLegacyPlans } from "../../../lib/mappers";
import { insertParticipant, updateParticipantStatus, insertPlanReminder, syncUserStats } from "../../../lib/db";
import { useProfileStore } from "../../profile/state/ProfileContext";
import { useCirclesStore } from "../../circles/state/CirclesContext";

interface ParticipantCounts {
  going: number;
  waitlist: number;
  delivered: number;
  seen: number;
  passed: number;
  pending: number;  // delivered + seen (invited but not yet responded)
  total: number;    // all non-host participants
}

interface PlansState {
  plans: Plan[];
  setPlans: React.Dispatch<React.SetStateAction<Plan[]>>;
  dbPlans: DbPlan[];
  setDbPlans: React.Dispatch<React.SetStateAction<DbPlan[]>>;
  dbPlanParticipants: DbPlanParticipant[];
  setDbPlanParticipants: React.Dispatch<React.SetStateAction<DbPlanParticipant[]>>;
  dbMemories: DbMemory[];
  setDbMemories: React.Dispatch<React.SetStateAction<DbMemory[]>>;
  joinPlan: (planId: string, userProfile: any) => void;
  leavePlan: (planId: string, userId: string) => void;
  passPlan: (planId: string, userId: string) => void;
  waitlistPlan: (planId: string, userProfile: any) => void;
  sendReminder: (planId: string, userId: string) => void;
  ignoreReminder: (planId: string, userId: string) => void;
  getHomeFeedPlans: (userId: string) => Plan[];
  getHubPlans: (userId: string) => Plan[];
  getParticipantCounts: (planUuid: string) => ParticipantCounts;
}

const PlansContext = createContext<PlansState | undefined>(undefined);

export const PlansProvider = ({ children, userId = "" }: React.PropsWithChildren<{ userId?: string }>) => {
  const [dbPlans, setDbPlans] = useState<DbPlan[]>([]);
  const [dbPlanParticipants, setDbPlanParticipants] = useState<DbPlanParticipant[]>([]);
  const [dbMemories, setDbMemories] = useState<DbMemory[]>([]);

  const [plans, setPlans] = useState<Plan[]>([]);

  const { dbUsers } = useProfileStore();
  const { dbCircleMembers } = useCirclesStore();

  const resolveUserUuid = (uId: string) => {
    const userObj = dbUsers.find(u => u.user_id === uId || u.id === uId);
    return userObj ? userObj.id : uId;
  };

  const joinPlan = (planId: string, userProfile: any) => {
    const matchedPlan = plans.find(p => p.id === planId);
    const planUuid = matchedPlan?.dbUuid || planId;
    const userUuid = userProfile.dbUuid || resolveUserUuid(userProfile.user_id || userId);

    // 1. Update UI plans state
    setPlans(prevPlans => prevPlans.map(plan => {
      if (plan.id === planId) {
        const alreadyJoined = plan.members.some(u => u.userId === userProfile.user_id && u.joinState === "going");
        if (alreadyJoined) return plan;

        const activeMembersCount = plan.members.filter(u => u.joinState === "going").length;
        if (activeMembersCount >= plan.capacity) {
          console.warn(`[Planless] Cannot join ${plan.title}, capacity reached (${plan.capacity}). Routing to waitlist.`);
          return plan;
        }

        const newMember: PlanMember = {
          userId: userProfile.user_id || userId,
          name: userProfile.name,
          avatar: userProfile.avatar,
          joinState: "going",
          reminderState: "none",
          joinedAt: new Date().toISOString()
        };

        const newMembersList = [...plan.members.filter(m => m.userId !== newMember.userId), newMember];

        return {
          ...plan,
          members: newMembersList,
          joinedUsers: newMembersList,
          confirmedCount: newMembersList.filter(m => m.joinState === "going").length
        };
      }
      return plan;
    }));

    // 2. Sync DB Participants
    setDbPlanParticipants(prev => {
      const exists = prev.some(p => (p.plan_id === planUuid || p.plan_id === planId) && (p.user_id === userUuid || p.user_id === userProfile.user_id));
      if (exists) {
        return prev.map(p => (p.plan_id === planUuid || p.plan_id === planId) && (p.user_id === userUuid || p.user_id === userProfile.user_id) ? { ...p, status: "going" as const } : p);
      }
      return [...prev, {
        participant_id: `PP_${Date.now()}`,
        plan_id: planUuid,
        user_id: userUuid,
        status: "going" as const,
        payment_status: matchedPlan && matchedPlan.cost > 0 ? "paid" : "unpaid",
        joined_at: new Date().toISOString()
      }];
    });

    // 3. Database Persistence
    if (planUuid && userUuid) {
      const existing = dbPlanParticipants.find(p => (p.plan_id === planUuid || p.plan_id === planId) && (p.user_id === userUuid || p.user_id === userProfile.user_id));
      if (existing && existing.id) {
        updateParticipantStatus(existing.id, "going", matchedPlan && matchedPlan.cost > 0 ? "paid" : "unpaid");
      } else {
        insertParticipant({
          plan_id: planUuid,
          user_id: userUuid,
          status: "going",
          payment_status: matchedPlan && matchedPlan.cost > 0 ? "paid" : "unpaid",
          joined_at: new Date().toISOString()
        });
      }
      syncUserStats(userUuid, "join_plan");
    }
  };

  const waitlistPlan = (planId: string, userProfile: any) => {
    const matchedPlan = plans.find(p => p.id === planId);
    const planUuid = matchedPlan?.dbUuid || planId;
    const userUuid = userProfile.dbUuid || resolveUserUuid(userProfile.user_id || userId);

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

    setDbPlanParticipants(prev => {
      const exists = prev.some(p => (p.plan_id === planUuid || p.plan_id === planId) && (p.user_id === userUuid || p.user_id === userProfile.user_id));
      if (exists) {
        return prev.map(p => (p.plan_id === planUuid || p.plan_id === planId) && (p.user_id === userUuid || p.user_id === userProfile.user_id) ? { ...p, status: "waitlist" as const } : p);
      }
      return [...prev, {
        participant_id: `PP_${Date.now()}`,
        plan_id: planUuid,
        user_id: userUuid,
        status: "waitlist" as const,
        payment_status: "unpaid" as const,
        joined_at: new Date().toISOString()
      }];
    });

    // Database Persistence
    if (planUuid && userUuid) {
      const existing = dbPlanParticipants.find(p => (p.plan_id === planUuid || p.plan_id === planId) && (p.user_id === userUuid || p.user_id === userProfile.user_id));
      if (existing && existing.id) {
        updateParticipantStatus(existing.id, "waitlist", "unpaid");
      } else {
        insertParticipant({
          plan_id: planUuid,
          user_id: userUuid,
          status: "waitlist",
          payment_status: "unpaid",
          joined_at: new Date().toISOString()
        });
      }
    }
  };

  const leavePlan = (planId: string, leaverId: string) => {
    const matchedPlan = plans.find(p => p.id === planId);
    const planUuid = matchedPlan?.dbUuid || planId;
    const userUuid = resolveUserUuid(leaverId);

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

    setDbPlanParticipants(prev => prev.filter(p => !((p.plan_id === planUuid || p.plan_id === planId) && (p.user_id === userUuid || p.user_id === leaverId))));

    // Database Persistence
    if (planUuid && userUuid) {
      const existing = dbPlanParticipants.find(p => (p.plan_id === planUuid || p.plan_id === planId) && (p.user_id === userUuid || p.user_id === leaverId));
      if (existing && existing.id) {
        fetch("/api/db/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: "plan_participants", match: { id: existing.id } })
        }).catch(err => console.error("Failed to delete participant:", err));
      }
    }
  };

  const passPlan = (planId: string, passerId: string) => {
    const matchedPlan = plans.find(p => p.id === planId);
    const planUuid = matchedPlan?.dbUuid || planId;
    const userUuid = resolveUserUuid(passerId);

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

    setDbPlanParticipants(prev => {
      const exists = prev.some(p => (p.plan_id === planUuid || p.plan_id === planId) && (p.user_id === userUuid || p.user_id === passerId));
      if (exists) {
        return prev.map(p => (p.plan_id === planUuid || p.plan_id === planId) && (p.user_id === userUuid || p.user_id === passerId) ? { ...p, status: "skipped" as const } : p);
      }
      return [...prev, {
        participant_id: `PP_${Date.now()}`,
        plan_id: planUuid,
        user_id: userUuid,
        status: "skipped" as const,
        payment_status: "unpaid" as const,
        joined_at: new Date().toISOString()
      }];
    });

    // Database Persistence
    if (planUuid && userUuid) {
      const existing = dbPlanParticipants.find(p => (p.plan_id === planUuid || p.plan_id === planId) && (p.user_id === userUuid || p.user_id === passerId));
      if (existing && existing.id) {
        updateParticipantStatus(existing.id, "passed", "unpaid");
      } else {
        insertParticipant({
          plan_id: planUuid,
          user_id: userUuid,
          status: "passed",
          payment_status: "unpaid",
          joined_at: new Date().toISOString()
        });
      }
    }
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

    const going     = rows.filter(r => r.status === "going").length;
    const waitlist  = rows.filter(r => r.status === "waitlist").length;
    const delivered = rows.filter(r => r.status === "delivered").length;
    // "seen" is not yet a DB enum value — keep as 0 unless schema adds it
    const seen      = 0;
    const passed    = rows.filter(r => r.status === "passed").length;
    const pending   = delivered + seen;
    const total     = rows.length;

    return { going, waitlist, delivered, seen, passed, pending, total };
  };

  const getHomeFeedPlans = (userId: string) => {
    // userId may be either the short user_id ("U001") or UUID
    const filtered = plans.filter(plan => {
      const member = plan.members.find(
        m => m.userId === userId || (m as any).userUuid === userId
      );
      if (!member) return false;
      const state = member.joinState;
      // Home reel shows pending/delivered invites only
      if (state === "going" || state === "host" || state === "passed" || state === "skipped") return false;
      return true;
    });

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

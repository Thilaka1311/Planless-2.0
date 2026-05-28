import React, { createContext, useContext, useState, ReactNode } from "react";
import { Plan, PlanMember } from "../../../core/types";
import {
  initialPlans,
  initialPlanParticipants,
  initialUsers,
  initialUserProfile,
  mapPlansToLegacyPlans
} from "../../../demo/seedData";

interface PlansState {
  plans: Plan[];
  setPlans: React.Dispatch<React.SetStateAction<Plan[]>>;
  joinPlan: (planId: string, userProfile: any) => void;
  leavePlan: (planId: string, userId: string) => void;
  passPlan: (planId: string, userId: string) => void;
  waitlistPlan: (planId: string, userProfile: any) => void;
  sendReminder: (planId: string, userId: string) => void;
  ignoreReminder: (planId: string, userId: string) => void;
  getHomeFeedPlans: (userId: string) => Plan[];
  getHubPlans: (userId: string) => Plan[];
}

const PlansContext = createContext<PlansState | undefined>(undefined);

export const PlansProvider = ({ children, userId = "U001" }: { children: ReactNode; userId?: string }) => {
  const [plans, setPlans] = useState<Plan[]>(() => {
    // Generate strict UI mapped plans from the pure DB seed layer based on dynamic logged-in userId
    const mapped = mapPlansToLegacyPlans(initialPlans, initialPlanParticipants, initialUsers, userId);
    return JSON.parse(JSON.stringify(mapped));
  });

  const joinPlan = (planId: string, userProfile: any) => {
    setPlans(prevPlans => prevPlans.map(plan => {
      if (plan.id === planId) {
        // Prevent duplicate joins (STRICT SINGLE SOURCE TRUTH)
        const alreadyJoined = plan.members.some(u => u.userId === userProfile.user_id && u.joinState === "going");
        if (alreadyJoined) return plan;

        // Capacity validation (Prevent ghost plans/false full states)
        const activeMembersCount = plan.members.filter(u => u.joinState === "going").length;
        if (activeMembersCount >= plan.capacity) {
          console.warn(`[Planless] Cannot join ${plan.title}, capacity reached (${plan.capacity}). Routing to waitlist.`);
          // Note: The UI layer shouldn't call joinPlan if capacity is full, but this provides a backend guarantee.
          return plan;
        }

        const newMember: PlanMember = {
          userId: userProfile.user_id || "U001",
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
          joinedUsers: newMembersList, // UI sync
          confirmedCount: newMembersList.filter(m => m.joinState === "going").length
        };
      }
      return plan;
    }));
  };

  const waitlistPlan = (planId: string, userProfile: any) => {
    setPlans(prevPlans => prevPlans.map(plan => {
      if (plan.id === planId) {
        const alreadyWaitlisted = plan.members.some(u => u.userId === userProfile.user_id && u.joinState === "waitlist");
        if (alreadyWaitlisted) return plan;

        const newMember: PlanMember = {
          userId: userProfile.user_id || "U001",
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
          joinedUsers: newMembersList, // UI Sync
          waitlistUsers: newMembersList.filter(m => m.joinState === "waitlist")
        };
      }
      return plan;
    }));
  };

  const leavePlan = (planId: string, userId: string) => {
    setPlans(prevPlans => prevPlans.map(plan => {
      if (plan.id === planId) {
        const newMembersList = plan.members.filter(u => u.userId !== userId);
        return {
          ...plan,
          members: newMembersList,
          joinedUsers: newMembersList,
          confirmedCount: newMembersList.filter(m => m.joinState === "going").length
        };
      }
      return plan;
    }));
  };

  const passPlan = (planId: string, userId: string) => {
    setPlans(prevPlans => prevPlans.map(plan => {
      if (plan.id === planId) {
        const newMembersList = plan.members.map(u =>
          u.userId === userId ? { ...u, joinState: "skipped" as const } : u
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
  };

  // Reminder System
  const sendReminder = (planId: string, userId: string) => {
    setPlans(prevPlans => prevPlans.map(plan => {
      if (plan.id === planId) {
        const newMembersList = plan.members.map(u =>
          u.userId === userId ? { ...u, reminderState: "sent" as const } : u
        );
        return {
          ...plan,
          members: newMembersList,
          joinedUsers: newMembersList.filter(m => m.joinState !== "passed")
        };
      }
      return plan;
    }));
  };

  const ignoreReminder = (planId: string, userId: string) => {
    // Ignoring a reminder automatically passes the plan
    passPlan(planId, userId);
  };

  // Home Feed strictly excludes plans the user is already "going" to or "passed" on, 
  // and excludes plans they host, while keeping joinable plans visible.
  // Sorted chronologically so that closest coordinates appear first.
  const getHomeFeedPlans = (userId: string) => {
    const filtered = plans.filter(plan => {
      if (plan.hostId === userId || plan.creatorId === "u_self") return false;
      const member = plan.members.find(m => m.userId === userId);
      if (member && (member.joinState === "going" || member.joinState === "waitlist" || member.joinState === "passed" || member.joinState === "skipped")) return false;
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

  // Plans Hub specifically strictly includes plans the user is actively "going" to
  // or is hosting themselves.
  const getHubPlans = (userId: string) => {
    return plans.filter(plan => {
      if (plan.hostId === userId || plan.creatorId === "u_self") return true;
      const member = plan.members.find(m => m.userId === userId);
      return member?.joinState === "going";
    });
  };

  return (
    <PlansContext.Provider value={{ plans, setPlans, joinPlan, leavePlan, passPlan, waitlistPlan, sendReminder, ignoreReminder, getHomeFeedPlans, getHubPlans }}>
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

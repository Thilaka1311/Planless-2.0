import { UserProfile, DbPlanParticipant, DbTransaction, DbMemory, DbUser, DbPlan, DbCircle, DbCircleMember, NotificationItem } from "../core/types";
import { 
  initialUserProfile, 
  initialUsers,
  initialPlans,
  initialCircles,
  initialNotifications,
  initialTransactions,
  initialCircleMembers,
  initialPlanParticipants,
  initialMemories
} from "./seedData";

/**
 * Creates a deeply cloned, pristine version of the seed data for a fresh demo run.
 * Prevents mutation from leaking across sessions.
 */
export const getFreshDemoState = () => {
  return {
    profile: JSON.parse(JSON.stringify(initialUserProfile)) as UserProfile,
    dbUsers: JSON.parse(JSON.stringify(initialUsers)) as DbUser[],
    dbPlans: JSON.parse(JSON.stringify(initialPlans)) as DbPlan[],
    dbCircles: JSON.parse(JSON.stringify(initialCircles)) as DbCircle[],
    dbCircleMembers: JSON.parse(JSON.stringify(initialCircleMembers)) as DbCircleMember[],
    dbPlanParticipants: JSON.parse(JSON.stringify(initialPlanParticipants)) as DbPlanParticipant[],
    dbTransactions: JSON.parse(JSON.stringify(initialTransactions)) as DbTransaction[],
    dbMemories: JSON.parse(JSON.stringify(initialMemories)) as DbMemory[],
    notifications: JSON.parse(JSON.stringify(initialNotifications)) as NotificationItem[]
  };
};

/**
 * Helper to force trigger the Supabase sandbox wipe 
 * when the app loads without a profile.
 */
export const resetBackendSandbox = async () => {
  try {
    const res = await fetch("/api/db/reset", { method: "POST" });
    if (!res.ok) {
      console.warn("[Demo State] Failed to reset sandbox on backend.");
    }
  } catch (err) {
    console.warn("[Demo State] Error resetting sandbox:", err);
  }
};

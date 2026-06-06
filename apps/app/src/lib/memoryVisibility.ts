import { DbMemory, DbMemoryAttendee, DbPlan, DbCircleMember } from "../core/types";

/**
 * Enforces the memory visibility rules:
 * Rule 1: Attendees always retain visibility access (even if they leave the circle later).
 * Rule 2: Non-attendees can view a memory only if they joined the circle BEFORE the memory was created.
 */
export function isMemoryVisibleToUser(
  memory: DbMemory,
  userId: string,
  memoryAttendees: DbMemoryAttendee[],
  plansList: DbPlan[],
  circleMembersList: DbCircleMember[]
): boolean {
  // Rule 1: Attendee Access
  const isAttendee = memoryAttendees.some(
    a => a.memory_id === memory.id && a.user_id === userId
  );
  if (isAttendee) return true;

  // Find the plan associated with the memory
  const plan = plansList.find(p => p.id === memory.plan_id);
  if (!plan) return false;

  // Rule 2: Circle Historical Access
  if (plan.circle_id) {
    const membership = circleMembersList.find(
      cm => cm.circle_id === plan.circle_id && cm.user_id === userId
    );
    if (membership) {
      const joinTime = new Date(membership.joined_at).getTime();
      const memoryTime = new Date(memory.created_at).getTime();
      return joinTime < memoryTime;
    }
  }

  return false;
}

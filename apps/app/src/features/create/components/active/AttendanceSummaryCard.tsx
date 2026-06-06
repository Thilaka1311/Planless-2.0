import React from "react";

export interface AttendanceSummary {
  hostCount: number;
  invitedParticipants: number;
  totalParticipants: number;
  goingCapacity: number;
  waitlistCapacity: number;
  splitCount: number;
}

/**
 * SINGLE SOURCE OF TRUTH for all attendance calculations.
 *
 * Canonical model:
 *   joinLimit  = goingCapacity = total attendees INCLUDING host.
 *
 * Example: joinLimit = 3
 *   → Host + Invitee #1 + Invitee #2 = 3 going (FULL)
 *   → Any further acceptances → waitlist
 *
 * No component should add +1 or subtract host from joinLimit.
 */
export function calculateAttendanceSummary({
  invitedParticipants,
  waitlistEnabled,
  joinLimit,
}: {
  invitedParticipants: number;
  waitlistEnabled: boolean;
  joinLimit: number;  // total going capacity INCLUDING host
}): AttendanceSummary {
  const hostCount = 1;
  const totalParticipants = invitedParticipants + hostCount;

  // goingCapacity IS joinLimit — already includes host, no +1 needed
  let goingCapacity: number;
  if (waitlistEnabled && joinLimit >= 2) {
    // joinLimit encodes total going seats (host included), minimum 2
    goingCapacity = Math.min(joinLimit, totalParticipants);
  } else {
    // No waitlist → everyone can go
    goingCapacity = totalParticipants;
  }

  const waitlistCapacity = Math.max(0, totalParticipants - goingCapacity);

  // Cost split: host + confirmed going invitees
  // going invitees = goingCapacity - hostCount (clamped to actual invited count)
  const goingInvitees = Math.min(goingCapacity - hostCount, invitedParticipants);
  const splitCount = Math.max(1, goingInvitees + hostCount);

  return {
    hostCount,
    invitedParticipants,
    totalParticipants,
    goingCapacity,
    waitlistCapacity,
    splitCount,
  };
}

interface AttendanceSummaryCardProps {
  invitedParticipants: number;
  waitlistEnabled: boolean;
  joinLimit: number;
  totalCost?: number;
}

export const AttendanceSummaryCard = ({
  invitedParticipants,
  waitlistEnabled,
  joinLimit,
  totalCost = 0,
}: AttendanceSummaryCardProps) => {
  const {
    hostCount,
    invitedParticipants: guests,
    totalParticipants,
    goingCapacity,
    waitlistCapacity,
    splitCount,
  } = calculateAttendanceSummary({
    invitedParticipants,
    waitlistEnabled,
    joinLimit,
  });

  const perPerson = totalCost > 0 ? Math.ceil(totalCost / splitCount) : 0;

  return (
    <div className="bg-zinc-950/60 border border-zinc-900 rounded-3xl p-4 space-y-3.5 text-left transition-all">
      {/* Attendance Summary Section */}
      <div className="space-y-2.5">
        <h4 className="text-[9px] font-mono font-bold text-brand-peach/85 tracking-wider uppercase leading-none">
          Attendance Summary
        </h4>
        <div className="space-y-1.5 text-xs font-mono">
          <div className="flex justify-between text-zinc-400">
            <span>Host</span>
            <span className="text-zinc-200">{hostCount}</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>Invited Participants</span>
            <span className="text-zinc-200">{guests}</span>
          </div>
          <div className="flex justify-between text-zinc-350 border-t border-zinc-900/40 pt-1">
            <span>Total Participants</span>
            <span className="text-zinc-200">{totalParticipants}</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>Going Capacity</span>
            <span className="text-zinc-200">{goingCapacity}</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>Waitlist Capacity</span>
            <span className="text-zinc-200">{waitlistCapacity}</span>
          </div>
        </div>
      </div>

      {/* Cost Split Section (if totalCost > 0) */}
      {totalCost > 0 && (
        <>
          <div className="border-t border-zinc-900 my-1" />
          <div className="space-y-2.5">
            <h4 className="text-[9px] font-mono font-bold text-brand-peach/85 tracking-wider uppercase leading-none">
              Cost Split
            </h4>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-zinc-400">
                <span>Total Cost</span>
                <span className="text-zinc-200">₹{totalCost}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Split Between</span>
                <span className="text-zinc-200">{splitCount} {splitCount === 1 ? "person" : "people"}</span>
              </div>
            </div>

            <div className="border-t border-zinc-900 pt-3 text-center">
              <span className="text-xl font-mono font-black text-brand-peach">₹{perPerson} each</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

import React from "react";
import { calculateAttendanceSummary } from "./AttendanceSummaryCard";

interface PlanSummaryProps {
  title: string;
  location?: string;
  time?: string;
  invitedCount: number;
  cost: string;
  waitlistEnabled?: boolean;
  joinLimit?: number;
}

export const PlanSummary = ({
  title,
  location,
  time,
  invitedCount,
  cost,
  waitlistEnabled = false,
  joinLimit = 0,
}: PlanSummaryProps) => {
  const totalCost = parseFloat(cost) || 0;
  const { splitCount } = calculateAttendanceSummary({
    invitedParticipants: invitedCount,
    waitlistEnabled,
    joinLimit,
  });
  const perPerson = totalCost > 0 ? Math.ceil(totalCost / splitCount) : 0;

  return (
    <div className="bg-zinc-950/40 border border-zinc-900/60 rounded-xl px-3 py-2 flex flex-col justify-center h-[56px] shrink-0 text-left space-y-1.5">
      <div className="text-xs font-semibold text-zinc-200 truncate leading-none">
        {title.trim() || "Untitled Plan"}
      </div>
      <div className="flex items-center flex-wrap gap-x-2.5 gap-y-0.5 text-[9.5px] text-zinc-500 font-mono leading-none">
        <span className="flex items-center gap-0.5 max-w-[100px] truncate">
          <span>📍</span> <span className="truncate">{location || "TBD"}</span>
        </span>
        <span className="flex items-center gap-0.5 shrink-0">
          <span>🕒</span> <span>{time || "TBD"}</span>
        </span>
        <span className="flex items-center gap-0.5 shrink-0">
          <span>👥</span> <span>{invitedCount} invited</span>
        </span>
        <span className="flex items-center gap-0.5 shrink-0 text-brand-peach/90 font-bold">
          <span>₹</span><span>{perPerson > 0 ? `${perPerson} each` : "Free"}</span>
        </span>
      </div>
    </div>
  );
};

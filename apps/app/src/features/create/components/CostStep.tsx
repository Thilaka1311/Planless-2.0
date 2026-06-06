import React from "react";
import { ArrowLeft } from "lucide-react";
import { CreatePlanCTAButton } from "./active/CreatePlanCTAButton";
import { PlanSummary } from "./active/PlanSummary";
import { AttendanceSummaryCard } from "./active/AttendanceSummaryCard";

interface CircleItem {
  id: string;
  name: string;
  membersCount: number;
  avatars: string[];
  membersList?: { userId: string }[];
}

interface CostStepProps {
  newPlanCost: string;
  setNewPlanCost: (val: string) => void;
  customPlanNotes: string;
  setCustomPlanNotes: (val: string) => void;
  setCreateFlowStep: (step: any) => void;
  audienceType: "circle" | "friends" | "multiple";
  selectedCircleIds: string[];
  selectedFriendIds: string[];
  circles: CircleItem[];
  waitlistEnabled?: boolean;
  joinLimit?: number;
  activeUserId: string | null;
  summary?: {
    title: string;
    location?: string;
    time?: string;
    invitedCount: number;
    cost: string;
    waitlistEnabled?: boolean;
    joinLimit?: number;
  };
}

const COST_PRESETS = [
  { val: "0", label: "Free" },
  { val: "300", label: "₹300" },
  { val: "500", label: "₹500" },
  { val: "1000", label: "₹1k" },
  { val: "1500", label: "₹1.5k" },
  { val: "2000", label: "₹2k" },
];

export const CostStep = ({
  newPlanCost,
  setNewPlanCost,
  customPlanNotes,
  setCustomPlanNotes,
  setCreateFlowStep,
  audienceType,
  selectedCircleIds,
  selectedFriendIds,
  circles,
  waitlistEnabled = false,
  joinLimit = 0,
  activeUserId,
  summary,
}: CostStepProps) => {
  const invitedParticipantsCount = React.useMemo(() => {
    const set = new Set<string>();

    selectedCircleIds.forEach((cid) => {
      const c = circles.find((x) => x.id === cid);
      if (c) {
        if (c.membersList) {
          c.membersList.forEach((m) => {
            if (m.userId && m.userId !== activeUserId) {
              set.add(m.userId);
            }
          });
        } else {
          const countWithoutHost = Math.max(0, c.membersCount - 1);
          for (let i = 0; i < countWithoutHost; i++) {
            set.add(`fallback_member_${cid}_${i}`);
          }
        }
      }
    });

    selectedFriendIds.forEach((fid) => {
      if (fid !== activeUserId) {
        set.add(fid);
      }
    });

    return set.size;
  }, [selectedCircleIds, selectedFriendIds, circles, activeUserId]);

  const totalCost = parseFloat(newPlanCost) || 0;

  return (
    <div className="space-y-6 animate-fade-in text-left flex flex-col justify-between min-h-[500px]">
      <div className="space-y-5">
        {/* Back */}
        <button
          type="button"
          onClick={() => setCreateFlowStep("RESPONSE_CUTOFF")}
          className="text-xs font-mono font-medium text-zinc-550 hover:text-zinc-200 flex items-center gap-1.5 cursor-pointer py-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to guests</span>
        </button>

        {summary && (
          <PlanSummary
            title={summary.title}
            location={summary.location}
            time={summary.time}
            invitedCount={invitedParticipantsCount}
            cost={summary.cost}
            waitlistEnabled={summary.waitlistEnabled}
            joinLimit={summary.joinLimit}
          />
        )}
        <div className="space-y-1">
          <h2 className="text-3xl font-display font-black text-zinc-100 tracking-tight leading-tight">
            Cost?
          </h2>
          <p className="text-xs text-zinc-550 font-sans">
            Enter the total spend and we'll split it automatically.
          </p>
        </div>

        {/* Center cost input & calculation */}
        <div className="space-y-4 py-2">
          <div className="space-y-1 text-center">
            <h3 className="text-sm font-display font-semibold text-zinc-400">Total Plan Cost</h3>
            <div className="relative flex items-center justify-center">
              <span className="text-3xl font-sans font-black text-white mr-1">₹</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={newPlanCost === "0" ? "" : newPlanCost}
                onChange={(e) => setNewPlanCost(e.target.value || "0")}
                className="bg-transparent border-none py-1 text-4xl font-mono font-black text-zinc-100 placeholder-zinc-800 focus:outline-none w-[180px] text-center"
                autoFocus
              />
            </div>
          </div>

          {/* Preset buttons */}
          <div className="flex gap-1.5 justify-center pt-1 overflow-x-auto no-scrollbar">
            {COST_PRESETS.map((preset) => (
              <button
                key={preset.val}
                type="button"
                onClick={() => setNewPlanCost(preset.val)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-[10px] font-semibold font-mono border transition-all ${
                  newPlanCost === preset.val
                    ? "bg-brand-peach/15 text-brand-peach border-brand-peach/40 animate-scale-in"
                    : "bg-zinc-950/50 text-zinc-500 border-zinc-900 hover:text-zinc-350 hover:border-zinc-855"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Dedicated Cost Split Card using reusable component */}
          <div className="space-y-2">
            <AttendanceSummaryCard
              invitedParticipants={invitedParticipantsCount}
              waitlistEnabled={waitlistEnabled}
              joinLimit={joinLimit}
              totalCost={totalCost}
            />
            <p className="text-[10px] text-zinc-550 font-sans text-center leading-relaxed px-2">
              Cost is divided only between confirmed attendees and the host.
            </p>
          </div>
        </div>

        {/* Optional notes */}
        <div className="space-y-2">
          <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 block font-bold">
            Note (optional)
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Meet near the entrance at 6:45 PM"
            value={customPlanNotes}
            onChange={(e) => setCustomPlanNotes(e.target.value)}
            className="w-full bg-zinc-950/70 border border-zinc-900 rounded-2xl px-4 py-3 text-xs text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-zinc-700 transition-all resize-none"
          />
        </div>
      </div>

      <div className="pt-2">
        <CreatePlanCTAButton
          text="NEXT — REVIEW →"
          onPress={() => setCreateFlowStep("REVIEW")}
        />
      </div>
    </div>
  );
};

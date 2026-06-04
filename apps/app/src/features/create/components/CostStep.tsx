import React from "react";
import { ArrowLeft, IndianRupee, Users } from "lucide-react";
import { CreatePlanCTAButton } from "./active/CreatePlanCTAButton";

interface CircleItem {
  id: string;
  name: string;
  membersCount: number;
  avatars: string[];
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
}: CostStepProps) => {
  // Calculate invited count
  const invitedCount = React.useMemo(() => {
    if (audienceType === "friends") return selectedFriendIds.length;
    return selectedCircleIds.reduce((sum, cid) => {
      const c = circles.find((x) => x.id === cid);
      return sum + (c ? c.membersCount : 0);
    }, 0);
  }, [audienceType, selectedFriendIds, selectedCircleIds, circles]);

  const totalCost = parseFloat(newPlanCost) || 0;
  // +1 for the host themselves
  const denominator = invitedCount > 0 ? invitedCount + 1 : 1;
  const perPerson = totalCost > 0 ? Math.ceil(totalCost / denominator) : 0;

  return (
    <div className="space-y-6 animate-fade-in text-left flex flex-col justify-between min-h-[500px]">
      <div className="space-y-5">
        {/* Back */}
        <button
          type="button"
          onClick={() => setCreateFlowStep("WHO")}
          className="text-xs font-mono font-medium text-zinc-550 hover:text-zinc-200 flex items-center gap-1.5 cursor-pointer py-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to guests</span>
        </button>

        <div className="space-y-1">
          <h2 className="text-3xl font-display font-black text-zinc-100 tracking-tight leading-tight">
            Cost?
          </h2>
          <p className="text-xs text-zinc-550 font-sans">
            Enter the total spend and we'll split it automatically.
          </p>
        </div>

        {/* Total cost input */}
        <div className="bg-zinc-950/70 border border-zinc-900 rounded-3xl p-5 space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-wider text-brand-peach block font-bold">
              Total Cost
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                <IndianRupee className="w-4 h-4 text-zinc-500" />
              </span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={newPlanCost === "0" ? "" : newPlanCost}
                onChange={(e) => setNewPlanCost(e.target.value || "0")}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-2xl pl-9 pr-4 py-3 text-xl text-zinc-100 font-mono font-bold focus:outline-none focus:border-brand-peach transition-all"
                autoFocus
              />
            </div>

            {/* Preset buttons */}
            <div className="flex gap-1.5 pt-1 overflow-x-auto no-scrollbar">
              {COST_PRESETS.map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => setNewPlanCost(preset.val)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-semibold font-mono border transition-all ${
                    newPlanCost === preset.val
                      ? "bg-brand-peach/15 text-brand-peach border-brand-peach/40"
                      : "bg-zinc-950/50 text-zinc-500 border-zinc-900 hover:text-zinc-300 hover:border-zinc-800"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live per-person calculation */}
          <div className={`rounded-2xl p-4 border transition-all ${totalCost > 0 ? "bg-brand-peach/5 border-brand-peach/20" : "bg-zinc-950/40 border-zinc-900"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-xs text-zinc-400 font-sans">
                  {denominator} {denominator === 1 ? "person" : "people"} (you{invitedCount > 0 ? ` + ${invitedCount}` : ""})
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-600 block">Per person</span>
                <span className={`text-lg font-mono font-black ${totalCost > 0 ? "text-brand-peach" : "text-zinc-600"}`}>
                  {totalCost > 0 ? `₹${perPerson}` : "—"}
                </span>
              </div>
            </div>
            {totalCost > 0 && (
              <p className="text-[9px] font-mono text-zinc-600 mt-2">
                ₹{totalCost} ÷ {denominator} people = ₹{perPerson} each
              </p>
            )}
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

import React from "react";
import { ArrowLeft, Edit2, Landmark, Users } from "lucide-react";
import { CreatePlanCTAButton } from "./active/CreatePlanCTAButton";

interface CircleItem {
  id: string;
  name: string;
  groupImage?: string;
  avatars: string[];
  membersCount: number;
}

interface CustomExtraSettingsStepProps {
  customPlanNotes: string;
  setCustomPlanNotes: (val: string) => void;
  newPlanCost: string;
  setNewPlanCost: (val: string) => void;
  waitlistEnabled: boolean;
  setWaitlistEnabled: (val: boolean) => void;
  joinLimit: number;
  setJoinLimit: (val: number) => void;
  selectedCircleIds: string[];
  selectedFriendIds: string[];
  circles: CircleItem[];
  audienceType: "circle" | "friends" | "multiple";
  setCreateFlowStep: (step: any) => void;
}

export const CustomExtraSettingsStep = ({
  customPlanNotes,
  setCustomPlanNotes,
  newPlanCost,
  setNewPlanCost,
  waitlistEnabled,
  setWaitlistEnabled,
  joinLimit,
  setJoinLimit,
  selectedCircleIds,
  selectedFriendIds,
  circles,
  audienceType,
  setCreateFlowStep,
}: CustomExtraSettingsStepProps) => {
  
  const getSelectedParticipantsCount = () => {
    if (audienceType === "friends") {
      return selectedFriendIds.length;
    }
    return selectedCircleIds.reduce((sum, cid) => {
      const c = circles.find(x => x.id === cid);
      return sum + (c ? c.membersCount : 0);
    }, 0);
  };

  const selectedCount = getSelectedParticipantsCount();

  React.useEffect(() => {
    if (waitlistEnabled && joinLimit > selectedCount) {
      setJoinLimit(selectedCount > 0 ? selectedCount : 1);
    }
  }, [selectedCount, waitlistEnabled, joinLimit, setJoinLimit]);

  return (
    <div className="space-y-6 animate-fade-in text-left flex flex-col justify-between min-h-[500px]">
      <div className="space-y-5">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => setCreateFlowStep("CUSTOM_RECIPIENTS")}
          className="text-xs font-mono font-medium text-zinc-550 hover:text-zinc-200 flex items-center gap-1.5 cursor-pointer py-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to guest list</span>
        </button>

        {/* Large Typography Focus Header */}
        <div className="space-y-2">
          <h2 className="text-3xl font-display font-black text-zinc-100 tracking-tight leading-tight">
            Extra details
          </h2>
          <p className="text-xs text-zinc-550 font-sans">
            Add notes, split amount, or set a spot limit.
          </p>
        </div>

        {/* Form Fields Stack */}
        <div className="bg-zinc-950/60 border border-zinc-900 rounded-3xl p-5 space-y-5">
          {/* Notes Option */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-brand-peach block font-bold">
              Notes for friends
            </span>
            <textarea
              rows={3}
              placeholder="e.g. Meet near Starbucks. Don't be late!"
              value={customPlanNotes}
              onChange={(e) => setCustomPlanNotes(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-850 rounded-2xl px-4 py-3 text-xs text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-brand-peach transition-all"
            />
          </div>

          {/* Split Cost Option */}
          <div className="space-y-2 pt-2 border-t border-zinc-900/60">
            <span className="text-[10px] font-mono uppercase tracking-wider text-brand-peach block font-bold">
              Cost per person
            </span>
            <div className="relative">
              <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-zinc-550 font-mono text-xs">
                ₹
              </span>
              <input
                type="number"
                placeholder="Free plan"
                value={newPlanCost === "0" ? "" : newPlanCost}
                onChange={(e) => setNewPlanCost(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-2xl pl-8 pr-4 py-2.5 text-xs text-zinc-100 font-mono focus:outline-none focus:border-brand-peach transition-all"
              />
            </div>
            {/* Cost presets */}
            <div className="flex gap-1.5 py-0.5 overflow-x-auto no-scrollbar">
              {[
                { val: "0", display: "Free Hang" },
                { val: "100", display: "₹100" },
                { val: "250", display: "₹250" },
                { val: "500", display: "₹500" },
                { val: "1000", display: "₹1k" }
              ].map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => setNewPlanCost(preset.val)}
                  className={`shrink-0 px-3 py-1 rounded-full text-[9px] font-semibold font-mono border transition-all ${
                    newPlanCost === preset.val
                      ? "bg-brand-peach/15 text-brand-peach border-brand-peach/40"
                      : "bg-zinc-950/50 text-zinc-500 border-zinc-900 hover:text-zinc-300"
                  }`}
                >
                  {preset.display}
                </button>
              ))}
            </div>
          </div>

          {/* Waitlist Option */}
          <div className="space-y-3 pt-3 border-t border-zinc-900/60">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono uppercase tracking-wider text-brand-peach block font-bold">
                Limit spot count
              </span>
              <input
                type="checkbox"
                checked={waitlistEnabled}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  setWaitlistEnabled(enabled);
                  if (enabled && joinLimit > selectedCount) {
                    setJoinLimit(selectedCount > 0 ? selectedCount : 1);
                  }
                }}
                className="accent-[#ff8b66] w-4.5 h-4.5 cursor-pointer"
              />
            </div>

            {waitlistEnabled && (
              <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-3.5 space-y-2">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-zinc-400 font-sans">Spots limit</span>
                  <span className="text-brand-peach font-mono font-bold">{joinLimit}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={selectedCount > 0 ? selectedCount : 1}
                  value={joinLimit}
                  onChange={(e) => setJoinLimit(Number(e.target.value))}
                  className="w-full accent-[#ff8b66] cursor-pointer"
                />
                <div className="flex justify-between text-[8px] font-mono text-zinc-650">
                  <span>1 spot</span>
                  <span>{selectedCount > 0 ? selectedCount : 1} max</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="pt-4">
        <CreatePlanCTAButton
          text="FINALIZE PLAN"
          onPress={() => {
            if (!newPlanCost) setNewPlanCost("0");
            setCreateFlowStep("PREVIEW");
          }}
        />
      </div>
    </div>
  );
};

import React from "react";
import { ArrowLeft } from "lucide-react";
import { CreatePlanCTAButton } from "./CreatePlanCTAButton";

interface ExtraSettingsStepProps {
  customPlanNotes: string;
  setCustomPlanNotes: (val: string) => void;
  newPlanCost: string;
  setNewPlanCost: (val: string) => void;
  setCreateFlowStep: (step: "BROWSE" | "DETAILS" | "RECIPIENTS" | "EXTRA" | "PREVIEW") => void;
}

export const ExtraSettingsStep = ({
  customPlanNotes,
  setCustomPlanNotes,
  newPlanCost,
  setNewPlanCost,
  setCreateFlowStep
}: ExtraSettingsStepProps) => {
  return (
    <div className="space-y-5 animate-fade-in text-left">
      <button
        type="button"
        onClick={() => setCreateFlowStep("RECIPIENTS")}
        className="text-xs font-mono font-medium text-zinc-500 hover:text-zinc-200 flex items-center gap-1.5 cursor-pointer py-1"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to recipients selection</span>
      </button>

      <div className="space-y-1">
        <h3 className="text-sm font-display font-semibold text-zinc-200">Extra details</h3>
        <p className="text-[11px] text-zinc-500 font-sans">Add optional notes or a split amount.</p>
      </div>

      <div className="bg-zinc-905 border border-zinc-900 rounded-2xl p-5 space-y-5 shadow-inner">
        <div className="space-y-2">
          <label className="text-[9px] text-zinc-400 font-mono uppercase tracking-widest block font-extrabold text-[#ff8b66]">1. Notes (Optional)</label>
          <textarea
            rows={3}
            placeholder="e.g., Meet near Gate B inside Starbucks. Wear white sneakers, and don't be late!"
            value={customPlanNotes}
            onChange={(e) => setCustomPlanNotes(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-brand-peach transition-all"
          />
        </div>

        <div className="space-y-2 pt-2 border-t border-zinc-900/60">
          <div className="flex items-center justify-between">
            <label className="text-[9px] text-zinc-400 font-mono uppercase tracking-widest block font-extrabold text-[#ff8b66]">2. Social Split Amount (Optional)</label>
            <span className="text-[9px] font-mono text-zinc-550 italic">Non-fintech, secondary</span>
          </div>

          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-500 font-mono text-xs">
              ₹
            </span>
            <input
              type="number"
              placeholder="0 (Free hang)"
              value={newPlanCost === "0" ? "" : newPlanCost}
              onChange={(e) => setNewPlanCost(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-850 rounded-xl pl-8 pr-3.5 py-2.5 text-xs text-zinc-100 font-mono focus:outline-none focus:border-brand-peach transition-all"
            />
          </div>

          <div className="flex gap-1.5 py-0.5 max-w-full overflow-x-auto no-scrollbar">
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
                className={`shrink-0 px-3 py-1 rounded-full text-[9px] font-semibold font-mono border transition-all ${newPlanCost === preset.val
                  ? "bg-brand-peach/15 text-brand-peach border-brand-peach/40"
                  : "bg-zinc-950/50 text-zinc-500 border-zinc-900 hover:text-zinc-300"
                  }`}
              >
                {preset.display}
              </button>
            ))}
          </div>
        </div>
      </div>

      <CreatePlanCTAButton
        text="FINALIZE PLAN"
        onPress={() => {
          if (!newPlanCost) setNewPlanCost("0");
          setCreateFlowStep("PREVIEW");
        }}
      />
    </div>
  );
};

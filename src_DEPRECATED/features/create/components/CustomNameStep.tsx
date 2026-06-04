import React from "react";
import { ArrowLeft } from "lucide-react";
import { CreatePlanCTAButton } from "./CreatePlanCTAButton";

interface CustomNameStepProps {
  newPlanTitle: string;
  setNewPlanTitle: (val: string) => void;
  setCreateFlowStep: (step: any) => void;
}

export const CustomNameStep = ({
  newPlanTitle,
  setNewPlanTitle,
  setCreateFlowStep,
}: CustomNameStepProps) => {
  const suggestions = [
    "Dune Part III",
    "Matchday Turf Football",
    "Birthday Dinner",
    "Rooftop Sundowner",
    "Late Brew Coffee"
  ];

  return (
    <div className="space-y-6 animate-fade-in text-left flex flex-col justify-between min-h-[480px]">
      <div className="space-y-6">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => setCreateFlowStep("BROWSE")}
          className="text-xs font-mono font-medium text-zinc-550 hover:text-zinc-200 flex items-center gap-1.5 cursor-pointer py-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to templates</span>
        </button>

        {/* Large Typography Focus Header */}
        <div className="space-y-2">
          <h2 className="text-3xl font-display font-black text-zinc-100 tracking-tight leading-tight">
            What's the plan?
          </h2>
          <p className="text-xs text-zinc-550 font-sans">
            Give your spontaneous coordinate a name.
          </p>
        </div>

        {/* Large Input Box */}
        <div className="space-y-4 pt-4">
          <input
            type="text"
            placeholder="e.g., Dune Part III"
            value={newPlanTitle}
            onChange={(e) => setNewPlanTitle(e.target.value)}
            className="w-full bg-transparent border-b border-zinc-800 focus:border-brand-peach py-3 text-lg text-zinc-100 placeholder-zinc-700 focus:outline-none transition-colors"
            autoFocus
            required
          />

          {/* Examples Container */}
          <div className="space-y-2">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-650 block font-bold">
              SUGGESTED IDEAS
            </span>
            <div className="flex flex-wrap gap-2 py-0.5">
              {suggestions.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setNewPlanTitle(p)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    newPlanTitle === p
                      ? "bg-brand-peach/15 text-brand-peach border-brand-peach/40 font-semibold"
                      : "bg-zinc-950/40 text-zinc-500 border-zinc-900 hover:text-zinc-300 hover:border-zinc-800"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="pt-6">
        <CreatePlanCTAButton
          text="CONTINUE"
          disabled={!newPlanTitle.trim()}
          onPress={() => setCreateFlowStep("CUSTOM_LOCATION")}
        />
      </div>
    </div>
  );
};

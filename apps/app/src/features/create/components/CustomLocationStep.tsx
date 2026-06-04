import React from "react";
import { ArrowLeft, MapPin } from "lucide-react";
import { CreatePlanCTAButton } from "./active/CreatePlanCTAButton";

interface CustomLocationStepProps {
  newPlanLocation: string;
  setNewPlanLocation: (val: string) => void;
  setCreateFlowStep: (step: any) => void;
}

export const CustomLocationStep = ({
  newPlanLocation,
  setNewPlanLocation,
  setCreateFlowStep,
}: CustomLocationStepProps) => {
  return (
    <div className="space-y-6 animate-fade-in text-left flex flex-col justify-between min-h-[480px]">
      <div className="space-y-6">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => setCreateFlowStep("WHAT")}
          className="text-xs font-mono font-medium text-zinc-550 hover:text-zinc-200 flex items-center gap-1.5 cursor-pointer py-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to activity</span>
        </button>

        <div className="space-y-2">
          <h2 className="text-3xl font-display font-black text-zinc-100 tracking-tight leading-tight">
            Where?
          </h2>
        </div>

        {/* Input */}
        <div className="space-y-4 pt-2">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
              <MapPin className="w-5 h-5 text-brand-peach" />
            </span>
            <input
              type="text"
              placeholder="Enter a location"
              value={newPlanLocation}
              onChange={(e) => setNewPlanLocation(e.target.value)}
              className="w-full bg-transparent border-b border-zinc-800 focus:border-brand-peach pl-7 py-3 text-lg text-zinc-100 placeholder-zinc-700 focus:outline-none transition-colors"
              autoFocus
            />
          </div>

          {/* Helper text examples */}
          <div className="text-xs text-zinc-550 space-y-1">
            <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-650 block font-bold">
              EXAMPLES
            </span>
            <p className="font-sans leading-relaxed">
              Koramangala Turf, PVR Nexus, Toit Indiranagar, Home, Cubbon Park
            </p>
          </div>
        </div>
      </div>

      <div className="pt-6">
        <CreatePlanCTAButton
          text="NEXT — WHEN? →"
          disabled={newPlanLocation.trim().length === 0}
          onPress={() => setCreateFlowStep("DATETIME")}
        />
      </div>
    </div>
  );
};

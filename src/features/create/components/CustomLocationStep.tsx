import React from "react";
import { ArrowLeft, MapPin } from "lucide-react";
import { CreatePlanCTAButton } from "./CreatePlanCTAButton";

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
  const venues = [
    "Starbucks Corner",
    "City Football Turf",
    "Downtown Pizzeria",
    "Phoenix Sky Deck",
    "Brew House Cafe"
  ];

  return (
    <div className="space-y-6 animate-fade-in text-left flex flex-col justify-between min-h-[480px]">
      <div className="space-y-6">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => setCreateFlowStep("CUSTOM_NAME")}
          className="text-xs font-mono font-medium text-zinc-550 hover:text-zinc-200 flex items-center gap-1.5 cursor-pointer py-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to plan name</span>
        </button>

        {/* Large Typography Focus Header */}
        <div className="space-y-2">
          <h2 className="text-3xl font-display font-black text-zinc-100 tracking-tight leading-tight">
            Where's the spot?
          </h2>
          <p className="text-xs text-zinc-550 font-sans">
            Specify the coordinate venue or meeting spot.
          </p>
        </div>

        {/* Input box with MapPin */}
        <div className="space-y-4 pt-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
              <MapPin className="w-5 h-5 text-brand-peach" />
            </span>
            <input
              type="text"
              placeholder="e.g., Starbucks Corner"
              value={newPlanLocation}
              onChange={(e) => setNewPlanLocation(e.target.value)}
              className="w-full bg-transparent border-b border-zinc-800 focus:border-brand-peach pl-7 py-3 text-lg text-zinc-100 placeholder-zinc-700 focus:outline-none transition-colors"
              autoFocus
              required
            />
          </div>

          {/* Suggested Venues */}
          <div className="space-y-2">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-650 block font-bold">
              POPULAR VENUES
            </span>
            <div className="flex flex-wrap gap-2 py-0.5">
              {venues.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setNewPlanLocation(loc)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    newPlanLocation === loc
                      ? "bg-brand-peach/15 text-brand-peach border-brand-peach/40 font-semibold"
                      : "bg-zinc-950/40 text-zinc-500 border-zinc-900 hover:text-zinc-300 hover:border-zinc-800"
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="pt-6">
        <CreatePlanCTAButton
          text="SET THE LOCATION"
          disabled={!newPlanLocation.trim()}
          onPress={() => setCreateFlowStep("CUSTOM_DATETIME")}
        />
      </div>
    </div>
  );
};

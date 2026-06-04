import React from "react";
import { ArrowLeft } from "lucide-react";
import { CreatePlanCTAButton } from "./CreatePlanCTAButton";

interface SportStepProps {
  selectedSport: "Football" | "Badminton" | "Basketball" | null;
  setSelectedSport: (sport: "Football" | "Badminton" | "Basketball") => void;
  setCreateFlowStep: (step: any) => void;
  onNext: () => void;
}

interface SportOption {
  id: "Football" | "Badminton" | "Basketball";
  label: string;
  emoji: string;
  description: string;
  gradient: string;
  accentColor: string;
}

const SPORTS: SportOption[] = [
  {
    id: "Football",
    label: "Football Turf",
    emoji: "⚽",
    description: "5-a-side / 7-a-side football turfs",
    gradient: "from-emerald-950/60 to-emerald-900/20",
    accentColor: "border-emerald-700/50 text-emerald-300",
  },
  {
    id: "Badminton",
    label: "Badminton Court",
    emoji: "🏸",
    description: "Synthetic / wooden indoor courts",
    gradient: "from-sky-950/60 to-sky-900/20",
    accentColor: "border-sky-700/50 text-sky-300",
  },
  {
    id: "Basketball",
    label: "Basketball Arena",
    emoji: "🏀",
    description: "Indoor or floodlit outdoor courts",
    gradient: "from-orange-950/60 to-orange-900/20",
    accentColor: "border-orange-700/50 text-orange-300",
  },
];

export const SportStep = ({
  selectedSport,
  setSelectedSport,
  setCreateFlowStep,
  onNext,
}: SportStepProps) => {
  return (
    <div className="space-y-6 animate-fade-in text-left flex flex-col justify-between min-h-[520px]">
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => setCreateFlowStep("WHAT")}
          className="text-xs font-mono font-medium text-zinc-500 hover:text-zinc-200 flex items-center gap-1.5 cursor-pointer py-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <div>
          <h2 className="text-xl font-bold font-sans text-white">Which sport?</h2>
          <p className="text-xs text-zinc-500 font-mono mt-1">SELECT A SPORT TYPE</p>
        </div>

        <div className="space-y-3">
          {SPORTS.map((sport) => {
            const isSelected = selectedSport === sport.id;
            return (
              <button
                key={sport.id}
                type="button"
                onClick={() => setSelectedSport(sport.id)}
                className={`w-full p-4 rounded-xl border text-left transition-all duration-300 relative group overflow-hidden bg-gradient-to-br ${
                  sport.gradient
                } ${
                  isSelected
                    ? `${sport.accentColor} bg-zinc-900/60 shadow-lg scale-[1.01]`
                    : "border-zinc-800 hover:border-zinc-700 bg-zinc-950/40 hover:bg-zinc-900/20"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-4 right-4 w-5 h-5 bg-[#ff5e3a] rounded-full flex items-center justify-center animate-fade-in shadow-md">
                    <svg viewBox="0 0 10 10" fill="none" className="w-2.5 h-2.5">
                      <path
                        d="M2 5l2 2 4-4"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <span className="text-3xl transition-transform duration-200 group-hover:scale-105">
                    {sport.emoji}
                  </span>
                  <div className="space-y-0.5">
                    <span className="block text-base font-bold text-white leading-none">
                      {sport.label}
                    </span>
                    <span className="block text-xs text-zinc-500 font-mono mt-1">
                      {sport.description}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-2">
        <CreatePlanCTAButton
          text={selectedSport ? `NEXT — SELECT VENUE →` : "SELECT A SPORT"}
          disabled={!selectedSport}
          onPress={onNext}
        />
      </div>
    </div>
  );
};

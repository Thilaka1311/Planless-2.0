import React from "react";
import { CreatePlanCTAButton } from "./CreatePlanCTAButton";

interface WhatStepProps {
  selectedActivity: string | null;
  setSelectedActivity: (activity: string | null) => void;
  setCreateFlowStep: (step: any) => void;
  setSelectedExperience: (exp: any) => void;
}

interface ActivityOption {
  id: "Sports" | "Movies" | "Dining" | "Custom";
  label: string;
  emoji: string;
  description: string;
  gradient: string;
  accentColor: string;
  defaultTitle: string;
  defaultImage: string;
  category: "sports" | "movies" | "restaurants" | "custom";
}

const ACTIVITIES: ActivityOption[] = [
  {
    id: "Sports",
    label: "Sports & Games",
    emoji: "⚽",
    description: "Coordinate a Match",
    gradient: "from-emerald-950/60 to-emerald-900/20",
    accentColor: "border-emerald-700/50 text-emerald-300",
    defaultTitle: "Sports Match",
    defaultImage: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80",
    category: "sports"
  },
  {
    id: "Movies",
    label: "Movies & Shows",
    emoji: "🎬",
    description: "For those Late Night Shows",
    gradient: "from-violet-950/60 to-violet-900/20",
    accentColor: "border-violet-700/50 text-violet-300",
    defaultTitle: "Movie Night",
    defaultImage: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80",
    category: "movies"
  },
  {
    id: "Dining",
    label: "Dining & Drinks",
    emoji: "🍽️",
    description: "Good Food, Great Mood",
    gradient: "from-amber-950/60 to-amber-900/20",
    accentColor: "border-amber-700/50 text-amber-300",
    defaultTitle: "Dinner Plans",
    defaultImage: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80",
    category: "restaurants"
  },
  {
    id: "Custom",
    label: "Custom Plan",
    emoji: "✨",
    description: "Literally just GO OUT!",
    gradient: "from-zinc-950/60 to-zinc-900/20",
    accentColor: "border-zinc-700/50 text-zinc-300",
    defaultTitle: "Custom Hangout",
    defaultImage: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=600&q=80",
    category: "custom"
  }
];

export const WhatStep = ({
  selectedActivity,
  setSelectedActivity,
  setCreateFlowStep,
  setSelectedExperience,
}: WhatStepProps) => {
  const handleSelect = (activity: ActivityOption) => {
    if (selectedActivity === activity.id) {
      setSelectedActivity(null);
      setSelectedExperience(null);
    } else {
      setSelectedActivity(activity.id);
      setSelectedExperience({
        id: `exp_${activity.id.toLowerCase()}`,
        title: activity.defaultTitle,
        category: activity.category,
        tag: activity.id.toUpperCase(),
        description: activity.description,
        time: "TODAY • 8:30 PM",
        venue: "",
        price: 0,
        image: activity.defaultImage,
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-left flex flex-col justify-between h-[550px]">
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold font-sans text-white">What are you doing?</h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {ACTIVITIES.map((activity) => {
            const isSelected = selectedActivity === activity.id;
            return (
              <button
                key={activity.id}
                type="button"
                onClick={() => handleSelect(activity)}
                className={`p-3.5 rounded-2xl border text-center transition-all duration-300 relative group overflow-hidden bg-gradient-to-br ${activity.gradient
                  } ${isSelected
                    ? "border-[#ff5e3a] bg-[#ff5e3a]/10 shadow-[0_0_12px_rgba(255,94,58,0.15)] scale-[1.01]"
                    : "border-zinc-850 hover:border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900/10"
                  } flex flex-col items-center justify-center gap-2.5 aspect-square cursor-pointer`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 w-4.5 h-4.5 bg-[#ff5e3a] rounded-full flex items-center justify-center animate-scale-in shadow-sm">
                    <svg viewBox="0 0 10 10" fill="none" className="w-2.5 h-2.5">
                      <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
                <span className="text-3xl transition-transform duration-200 group-hover:scale-105 select-none">
                  {activity.emoji}
                </span>
                <div className="text-center space-y-0.5">
                  <span className="block text-xs font-bold text-white leading-tight">{activity.label}</span>
                  <span className="block text-[9px] text-zinc-550 font-mono leading-tight">{activity.description}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-6 pb-2">
        <CreatePlanCTAButton
          text={selectedActivity ? "Continue" : "SELECT AN ACTIVITY"}
          disabled={!selectedActivity}
          hideArrow={true}
          onPress={() => setCreateFlowStep("LOCATION")}
        />
      </div>
    </div>
  );
};

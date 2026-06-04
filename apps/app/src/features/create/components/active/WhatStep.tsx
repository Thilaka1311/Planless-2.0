import React from "react";
import { CreatePlanCTAButton } from "./CreatePlanCTAButton";

interface WhatStepProps {
  selectedActivity: string | null;
  setSelectedActivity: (activity: string) => void;
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
    description: "Football, badminton, basketball — coordinate a match",
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
    description: "Cinema trips and watch parties",
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
    description: "Cafes, restaurants, pub crawls",
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
    description: "Create anything from scratch",
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
  };

  return (
    <div className="space-y-6 animate-fade-in text-left flex flex-col justify-between min-h-[520px]">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold font-sans text-white">What are you doing?</h2>
          <p className="text-xs text-zinc-500 font-mono mt-1">SELECT AN ACTIVITY</p>
        </div>

        <div className="space-y-3">
          {ACTIVITIES.map((activity) => {
            const isSelected = selectedActivity === activity.id;
            return (
              <button
                key={activity.id}
                type="button"
                onClick={() => handleSelect(activity)}
                className={`w-full p-4 rounded-xl border text-left transition-all duration-300 relative group overflow-hidden bg-gradient-to-br ${
                  activity.gradient
                } ${
                  isSelected
                    ? `${activity.accentColor} shadow-lg scale-[1.01]`
                    : "border-zinc-800 hover:border-zinc-700 bg-zinc-950/40 hover:bg-zinc-900/20"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-4 right-4 w-5 h-5 bg-[#ff5e3a] rounded-full flex items-center justify-center animate-fade-in shadow-md">
                    <svg viewBox="0 0 10 10" fill="none" className="w-2.5 h-2.5">
                      <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <span className="text-3xl transition-transform duration-200 group-hover:scale-105">
                    {activity.emoji}
                  </span>
                  <div className="space-y-0.5">
                    <span className="block text-base font-bold text-white leading-none">{activity.label}</span>
                    <span className="block text-xs text-zinc-500 font-mono mt-1">{activity.description}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-2">
        <CreatePlanCTAButton
          text={selectedActivity ? "NEXT — WHERE? →" : "SELECT AN ACTIVITY"}
          disabled={!selectedActivity}
          onPress={() => setCreateFlowStep("LOCATION")}
        />
      </div>
    </div>
  );
};

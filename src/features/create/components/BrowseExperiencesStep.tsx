import React, { useRef } from "react";
import { Sparkles, Plus, ChevronRight, Film, Trophy, Utensils } from "lucide-react";

interface SuggestedExperience {
  id: string;
  title: string;
  category: "movies" | "sports" | "restaurants" | "custom";
  tag: string;
  description: string;
  time: string;
  venue: string;
  price: number;
  image: string;
}

interface BrowseExperiencesStepProps {
  aiVibePrompt: string;
  setAiVibePrompt: (val: string) => void;
  isGeneratingAiPlan: boolean;
  handleAiGeneratePlan: () => Promise<void>;
  setSelectedExperience: (exp: SuggestedExperience) => void;
  setNewPlanTitle: (val: string) => void;
  setNewPlanLocation: (val: string) => void;
  setNewPlanTime: (val: string) => void;
  setNewPlanCost: (val: string) => void;
  setCreateFlowStep: (step: "BROWSE" | "DETAILS" | "RECIPIENTS" | "EXTRA" | "PREVIEW") => void;
  newPlanCategory: string;
  setNewPlanCategory: (cat: string) => void;
  suggestedExperiences: SuggestedExperience[];
}

export const BrowseExperiencesStep = ({
  aiVibePrompt,
  setAiVibePrompt,
  isGeneratingAiPlan,
  handleAiGeneratePlan,
  setSelectedExperience,
  setNewPlanTitle,
  setNewPlanLocation,
  setNewPlanTime,
  setNewPlanCost,
  setCreateFlowStep,
  newPlanCategory,
  setNewPlanCategory,
  suggestedExperiences
}: BrowseExperiencesStepProps) => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [carouselIndex, setCarouselIndex] = React.useState<number>(0);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollLeft = container.scrollLeft;
    const width = container.offsetWidth || 300;
    const newIndex = Math.min(
      Math.max(Math.round(scrollLeft / (width * 0.75)), 0),
      2
    );
    if (newIndex !== carouselIndex) {
      setCarouselIndex(newIndex);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in text-left">
      <div className="space-y-1">
        <h2 className="text-xl font-display font-black text-zinc-100 tracking-tight">Spawn Spontaneous Hanging</h2>
        <p className="text-xs text-zinc-500">Pick template coordinates or plan from absolute scratch instantly.</p>
      </div>

      {/* 🌟 AI COORDINATION SPARK / PLANNER */}
      <div
        id="ai_plan_coordinator_card"
        className="relative bg-gradient-to-br from-zinc-950 to-zinc-900 border border-[#ff8b66]/35 rounded-3xl p-5 shadow-xl overflow-hidden"
      >
        <div className="absolute -left-12 -bottom-12 w-28 h-28 bg-[#ff8b66]/10 blur-2xl rounded-full" />
        <div className="absolute -right-8 -top-8 w-24 h-24 bg-[#ff5d41]/5 blur-2xl rounded-full" />

        <div className="relative space-y-3.5 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#ff8b66]/10 border border-[#ff8b66]/30 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-[#ff8b66]" />
              </div>
              <div>
                <h3 className="text-xs font-sans font-bold text-white flex items-center gap-1.5 leading-none">
                  AI Social Coordinator
                </h3>
                <span className="text-[8px] font-mono text-brand-peach/80 font-bold uppercase tracking-wider">Gemini 3.5 Flash Powered</span>
              </div>
            </div>
            <span className="text-[7.5px] font-mono text-emerald-400 font-extrabold px-2 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-900/30">● COORDINATE ONLINE</span>
          </div>

          <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">
            Describe your plan vibe (e.g. <span className="text-zinc-300 italic">"spontaneous football session tonight"</span> or <span className="text-zinc-300 italic">"late night coffee talk"</span>) and let Gemini instantly align all coordinates.
          </p>

          <div className="space-y-2">
            <textarea
              value={aiVibePrompt}
              onChange={(e) => setAiVibePrompt(e.target.value)}
              placeholder="Tell AI your vibe..."
              className="w-full bg-zinc-950/80 border border-zinc-850 focus:border-brand-peach/50 focus:outline-none rounded-xl p-2.5 text-[11px] text-zinc-200 placeholder-zinc-650 resize-none h-14 transition-all no-scrollbar"
            />

            <button
              type="button"
              onClick={handleAiGeneratePlan}
              disabled={isGeneratingAiPlan || !aiVibePrompt.trim()}
              className={`w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${isGeneratingAiPlan
                ? "bg-zinc-900 text-zinc-500 cursor-not-allowed"
                : !aiVibePrompt.trim()
                  ? "bg-zinc-900 text-zinc-550 cursor-not-allowed"
                  : "bg-brand-peach text-zinc-955 hover:bg-opacity-90 active:scale-[0.98]"
                }`}
            >
              {isGeneratingAiPlan ? (
                <>
                  <span className="w-3 h-3 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
                  <span>Aligning coordinates with AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Plan with AI Spark ✨</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* OFFICIAL CREATE CUSTOM PLAN HERO CTA */}
      <div
        id="create_custom_plan_hero"
        onClick={() => {
          const customPreset = suggestedExperiences.find(s => s.category === "custom") || {
            id: "exp_custom",
            title: "Custom Spontaneous Plan",
            category: "custom" as const,
            tag: "CUSTOM",
            description: "Spawn spontaneous coordinator coordinates for your groups...",
            time: "TODAY • 8:30 PM",
            venue: "Cozy Cafe HQ",
            price: 0,
            image: "https://images.unsplash.com/photo-1543807535-eceef0bc6599?auto=format&fit=crop&w=600&q=80"
          };
          setSelectedExperience(customPreset as any);
          setNewPlanTitle("");
          setNewPlanLocation("");
          setNewPlanTime("TODAY • 8:30 PM");
          setNewPlanCost("0");
          setCreateFlowStep("DETAILS");
        }}
        className="relative bg-gradient-to-br from-zinc-900 to-zinc-955 border border-brand-peach/20 hover:border-brand-peach/40 rounded-3xl p-5 cursor-pointer shadow-xl transition-all select-none overflow-hidden group"
      >
        <div className="absolute -right-12 -top-12 w-28 h-28 bg-[#ff8b66]/10 blur-2xl rounded-full group-hover:bg-[#ff8b66]/15 transition-all duration-300" />

        <div className="flex gap-4 items-center">
          <div className="w-11 h-11 rounded-2xl bg-[#ff8b66]/10 border border-[#ff8b66]/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
            <Plus className="w-5 h-5 text-[#ff8b66]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-mono tracking-widest text-[#ff8b66] uppercase font-bold bg-[#ff8b66]/10 px-2 py-0.5 rounded-full border border-[#ff8b66]/15">Lightweight</span>
              <span className="text-[8px] font-mono text-emerald-400 font-bold">● FAST TO COMPLETE</span>
            </div>
            <h3 className="text-sm font-sans font-bold text-white mt-1.5 flex items-center gap-1">
              Create Custom Plan
              <Sparkles className="w-3.5 h-3.5 text-[#ff8b66] animate-pulse" />
            </h3>
            <p className="text-[10px] text-zinc-500 leading-normal mt-0.5">Define your own activity name, venue / coordinates, and timings</p>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-650 group-hover:text-white group-hover:translate-x-0.5 transition-all mr-1" />
        </div>
      </div>

      <div className="flex items-center gap-2.5 py-1">
        <div className="h-[1px] bg-zinc-900 flex-1" />
        <span className="text-[8px] font-mono uppercase tracking-widest text-[#ff8b66]/50">Or choose spontaneous presets</span>
        <div className="h-[1px] bg-zinc-900 flex-1" />
      </div>

      {/* Categories Fast Filter Selector */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
        {[
          { key: "all", label: "All Suggested", icon: Sparkles },
          { key: "movies", label: "Movies", icon: Film },
          { key: "sports", label: "Sports", icon: Trophy },
          { key: "restaurants", label: "Table Booking", icon: Utensils }
        ].map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => {
              setNewPlanCategory(cat.key);
            }}
            className={`flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full text-[10px] font-mono border transition-all cursor-pointer ${newPlanCategory === cat.key
              ? "bg-[#ff8b66]/15 text-brand-peach border-brand-peach/30 font-semibold shadow-inner"
              : "bg-zinc-950/40 text-zinc-400 border-zinc-900 hover:text-zinc-200"
              }`}
          >
            <cat.icon className="w-3 h-3" />
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Experience Carousel */}
      <div className="relative w-full overflow-hidden py-1">
        <div
          ref={carouselRef}
          onScroll={handleScroll}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-2 px-1"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {suggestedExperiences
            .filter(item => {
              if (newPlanCategory === "all") return item.category !== "custom";
              return item.category === newPlanCategory;
            })
            .map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedExperience(item);
                  setNewPlanTitle(item.title);
                  setNewPlanLocation(item.venue);
                  setNewPlanTime(item.time);
                  setNewPlanCost(item.price.toString());
                  setCreateFlowStep("DETAILS");
                }}
                className="w-[85%] sm:w-[88%] shrink-0 snap-center rounded-3xl aspect-[10/12] relative overflow-hidden bg-zinc-950 border border-zinc-900 shadow-xl flex flex-col justify-between p-5 cursor-pointer hover:border-zinc-850 transition-all group"
                style={{ scrollSnapAlign: "center" }}
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-45 group-hover:scale-102 transition-all duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/20" />

                <div className="z-10 flex items-center justify-between">
                  <span className="bg-white/5 backdrop-blur-sm text-zinc-350 border border-white/5 text-[8px] font-mono uppercase tracking-[0.14em] px-2.5 py-1 rounded-full whitespace-nowrap">
                    {item.tag}
                  </span>
                  <span className="text-[8px] font-mono font-bold text-[#ff8b66] bg-[#ff8b66]/10 px-2.5 py-1 rounded-full border border-[#ff8b66]/20 uppercase tracking-wider">
                    {item.category}
                  </span>
                </div>

                <div className="z-10 space-y-3 mt-auto text-left">
                  <div className="space-y-1">
                    <h3 className="text-base font-display font-medium text-white tracking-tight leading-none">
                      {item.title}
                    </h3>
                    <p className="text-[10px] text-zinc-400 font-sans line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="w-full bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 text-white font-medium text-[10px] py-2 px-3 rounded-xl flex items-center justify-between transition-colors shadow-inner">
                    <span className="font-mono">Fill in spontaneous timings</span>
                    <ChevronRight className="w-3.5 h-3.5 text-brand-peach" />
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

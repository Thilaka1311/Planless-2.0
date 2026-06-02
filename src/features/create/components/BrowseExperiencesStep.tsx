import React, { useState, useEffect } from "react";
import { Search, Plus } from "lucide-react";
import { getSectionsByCategory } from "../../../services/discoveryService";
import { DiscoverySection as DiscoverySectionType, DiscoveryItem } from "../../../core/types/discovery";
import { HeroBanner } from "./discovery/HeroBanner";
import { DiscoverySection } from "./discovery/DiscoverySection";

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
  cuisine?: string;
  distance?: string;
  rating?: string;
}

interface BrowseExperiencesStepProps {
  setSelectedExperience: (exp: SuggestedExperience) => void;
  setNewPlanTitle: (val: string) => void;
  setNewPlanLocation: (val: string) => void;
  setNewPlanTime: (val: string) => void;
  setNewPlanCost: (val: string) => void;
  setCreateFlowStep: (step: any) => void;
  newPlanCategory: string;
  setNewPlanCategory: (cat: string) => void;
  suggestedExperiences: SuggestedExperience[];
}

const HeartInHandIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Tilted Wrist Cuff */}
    <rect x="3.2" y="13.5" width="2" height="6.5" rx="1" transform="rotate(-15 4.2 16.75)" />
    
    {/* Continuous Hand Outline (Thumb, Palm, and Fingers) */}
    <path d="M 4.5 15.2 C 6 14.2, 7 13.8, 7.8 13.5 C 9.2 12.8, 10.5 13.5, 10.5 14.8 C 10.5 15.8, 9.5 16.5, 8 16.5 C 8.5 17.2, 9.5 17.2, 10.5 16.8 L 18.2 13.2 C 19.2 12.8, 20.2 13.5, 20.2 14.5 C 20.2 15.5, 19.2 16.2, 18.2 16.6 L 12.5 19.2 C 10 20.5, 7 20, 5.2 18.5" />
    
    {/* Back Heart (tilted left) */}
    <path 
      d="M12 5c-1.2-1.5-3-2-4.5-.5-1.5 1.5-1 3.5 1.5 6l3 3 3-3c2.5-2.5 3-4.5 1.5-6-1.5-1.5-3.3-1-4.5.5z" 
      transform="translate(-1, 0.5) scale(0.7) rotate(-20 12 8.5)"
    />
    
    {/* Front Heart (tilted right) */}
    <path 
      d="M12 5c-1.2-1.5-3-2-4.5-.5-1.5 1.5-1 3.5 1.5 6l3 3 3-3c2.5-2.5 3-4.5 1.5-6-1.5-1.5-3.3-1-4.5.5z" 
      transform="translate(4.5, 2.5) scale(0.85) rotate(15 12 8.5)"
    />
  </svg>
);

export const BrowseExperiencesStep = ({
  setSelectedExperience,
  setNewPlanTitle,
  setNewPlanLocation,
  setNewPlanTime,
  setNewPlanCost,
  setCreateFlowStep,
  suggestedExperiences
}: BrowseExperiencesStepProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [sections, setSections] = useState<DiscoverySectionType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load sections from Supabase on activeTab change
  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    const dbCategory = activeTab === "home" ? "for_you" : activeTab;
    
    getSectionsByCategory(dbCategory)
      .then((data) => {
        if (active) {
          setSections(data);
          setIsLoading(false);
          
          // Logging requirements
          const itemsCount = data.reduce((acc, sec) => acc + (sec.items?.length || 0), 0);
          console.log(`Loaded sections: ${data.length}`);
          console.log(`Loaded discovery items: ${itemsCount}`);
          console.log(`Selected category: ${dbCategory}`);
        }
      })
      .catch((err) => {
        console.error("Error loading discovery sections:", err);
        if (active) {
          setError("Unable to load recommendations");
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [activeTab]);

  const mapDiscoveryItemToExperience = (item: DiscoveryItem): SuggestedExperience => {
    return {
      id: item.id,
      title: item.title,
      category: item.content_type === "dining" ? "restaurants" : (item.content_type || "custom") as any,
      tag: item.badge || "FEATURED",
      description: item.subtitle || "",
      time: item.content_type === "movie" ? "TODAY • 8:30 PM" : "TOMORROW • 7:30 PM",
      venue: item.location || "TBD Meetup Location",
      price: parseFloat(item.price || "0"),
      image: item.image_url || "https://images.unsplash.com/photo-1543807535-eceef0bc6599?auto=format&fit=crop&w=600&q=80",
      rating: item.content_type === "dining" ? (item.badge?.split("★")[0]?.trim() || "4.5") : undefined,
      distance: item.content_type === "dining" ? (item.badge?.split("•")[1]?.trim() || "1.0 km") : undefined,
    };
  };

  const handleItemSelect = (item: DiscoveryItem) => {
    const exp = mapDiscoveryItemToExperience(item);
    setSelectedExperience(exp);
    setNewPlanTitle(exp.title);
    setNewPlanLocation(exp.venue);
    setNewPlanTime(exp.time);
    setNewPlanCost(exp.price.toString());
    setCreateFlowStep("DETAILS");
  };

  const launchCustomPlan = () => {
    const customPreset = suggestedExperiences.find((s) => s.category === "custom") || {
      id: "exp_custom",
      title: "Custom Spontaneous Plan",
      category: "custom" as const,
      tag: "CUSTOM",
      description: "Create plans from absolute scratch...",
      time: "TODAY • 8:30 PM",
      venue: "Cozy Cafe HQ",
      price: 0,
      image: "https://images.unsplash.com/photo-1543807535-eceef0bc6599?auto=format&fit=crop&w=600&q=80",
    };
    setSelectedExperience(customPreset as any);
    setNewPlanTitle("");
    setNewPlanLocation("");
    setNewPlanTime("TODAY • 8:30 PM");
    setNewPlanCost("0");
    setCreateFlowStep("CUSTOM_NAME");
  };

  const tabs = [
    { key: "home", label: "For You", icon: HeartInHandIcon },
    { key: "movies", label: "Movies" },
    { key: "sports", label: "Sports" },
    { key: "dining", label: "Dining" },
  ];

  // Client-side search filtering within loaded database sections
  const filteredSections = sections.map(section => {
    if (!searchQuery.trim()) return section;
    const q = searchQuery.toLowerCase();
    const filteredItems = (section.items || []).filter(
      item =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q))
    );
    return { ...section, items: filteredItems };
  }).filter(section => (section.items || []).length > 0);

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Title */}
      <div className="space-y-1">
        <h2 className="text-2xl font-display font-black text-zinc-100 tracking-tight">
          Create Plans
        </h2>
        <p className="text-xs text-zinc-550">
          Discover coordinates or start from scratch.
        </p>
      </div>

      {/* Primary Action Area: Search + Circular Custom Plan Button Inside */}
      <div className="relative flex items-center bg-zinc-900/30 backdrop-blur-md border border-zinc-850/80 rounded-2xl shadow-inner">
        <span className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-zinc-600" />
        </span>
        <input
          type="text"
          placeholder="Search activities, movies, sports, dining..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent pl-11 pr-12 py-3.5 text-xs text-zinc-100 placeholder-zinc-650 focus:outline-none font-sans"
        />
        <button
          type="button"
          onClick={launchCustomPlan}
          className="absolute right-2 w-8 h-8 bg-gradient-to-br from-[#ff8b66] to-[#ff5e3a] hover:from-[#ff9a7c] hover:to-[#ff6f4e] text-white rounded-full flex items-center justify-center cursor-pointer shadow-md transition-all active:scale-95 border border-brand-peach/15"
          title="Create Custom Plan"
        >
          <Plus className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Category Tab Row matching reference image */}
      <div className="border-b border-zinc-900/60 pb-0.5 pt-1">
        <div className="flex gap-6 overflow-x-auto no-scrollbar items-center">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`relative pb-2.5 font-sans text-sm font-semibold tracking-tight transition-colors cursor-pointer shrink-0 flex items-center justify-center ${
                  isActive ? "text-brand-peach font-bold" : "text-zinc-500 hover:text-zinc-350"
                }`}
              >
                {tab.icon ? (
                  <div className="flex items-center gap-1.5">
                    <tab.icon className={`w-[22px] h-[22px] mt-0.5 ${isActive ? "text-brand-peach" : "text-zinc-500"}`} />
                    <span>{tab.label}</span>
                  </div>
                ) : (
                  tab.label
                )}
                
                {/* Underline selection indicator */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#ff5e3a] rounded-full animate-fade-in" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Discovery Feeds Container */}
      <div className="space-y-6">
        
        {/* Loading Skeletons */}
        {isLoading ? (
          <div className="space-y-6 animate-pulse select-none">
            {[1, 2].map((s) => (
              <div key={s} className="space-y-3 pt-1">
                {/* Title Skeleton */}
                <div className="h-4 bg-zinc-800/80 rounded-md w-1/3"></div>
                {/* Horizontal Cards Row Skeleton */}
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-3">
                  {[1, 2, 3].map((c) => (
                    <div key={c} className="w-[190px] h-[160px] bg-zinc-900/50 rounded-2xl shrink-0 border border-zinc-850/50"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          /* Error State View */
          <div className="text-center py-16 bg-zinc-950/40 border border-zinc-900/60 rounded-3xl p-5 select-none text-rose-500 font-mono text-xs">
            ⚠️ {error}
          </div>
        ) : (
          <>
            {/* 🌊 EDITORIAL HERO BANNER (only on For You tab and when not searching) */}
            {activeTab === "home" && !searchQuery.trim() && (
              <HeroBanner onActionClick={launchCustomPlan} />
            )}

            {/* Render sections dynamically */}
            {filteredSections.map((section) => {
              // Logging rendered information
              console.log(`Rendered section: ${section.section_name}`);
              console.log(`Cards rendered: ${section.items?.length || 0}`);
              return (
                <DiscoverySection
                  key={section.id}
                  section={section}
                  onItemSelect={handleItemSelect}
                />
              );
            })}

            {/* Empty State */}
            {filteredSections.length === 0 && (
              <div className="text-center py-16 bg-zinc-950/40 border border-zinc-900/60 rounded-3xl p-5 select-none">
                <p className="text-xs text-zinc-650 font-mono">No matching activities found</p>
                <button
                  type="button"
                  onClick={launchCustomPlan}
                  className="text-[10px] text-brand-peach font-bold mt-2 hover:underline"
                >
                  Create Custom Plan instead →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

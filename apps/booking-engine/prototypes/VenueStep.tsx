import React from "react";
import { ArrowLeft, MapPin } from "lucide-react";
import { CreatePlanCTAButton } from "../../app/src/features/create/components/active/CreatePlanCTAButton";
import { ActivityVenue } from "../../app/src/core/types";

interface VenueStepProps {
  selectedSport: "Football" | "Badminton" | "Basketball";
  selectedVenue: ActivityVenue | null;
  setSelectedVenue: (venue: ActivityVenue) => void;
  setCreateFlowStep: (step: any) => void;
  onNext: () => void;
}

const VENUES_DB: Record<"Football" | "Badminton" | "Basketball", (ActivityVenue & { distance: string; image: string })[]> = {
  Football: [
    {
      id: "foot_koramangala",
      name: "Koramangala Turf Arena",
      costPerPerson: 200,
      timeSlots: [
        { label: "6:00 PM - 7:00 PM", iso: "18:00" },
        { label: "7:00 PM - 8:00 PM", iso: "19:00" },
        { label: "8:00 PM - 9:00 PM", iso: "20:00" },
      ],
      tags: ["5-a-side", "Floodlit", "Changing Rooms"],
      distance: "1.2 km",
      image: "https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=300&q=80",
      venue_cost: 2000
    } as any,
    {
      id: "foot_hsr",
      name: "HSR Turf Ground",
      costPerPerson: 180,
      timeSlots: [
        { label: "6:00 PM - 7:00 PM", iso: "18:00" },
        { label: "7:00 PM - 8:00 PM", iso: "19:00" },
        { label: "8:00 PM - 9:00 PM", iso: "20:00" },
      ],
      tags: ["7-a-side", "Free Parking", "Drinking Water"],
      distance: "2.4 km",
      image: "https://images.unsplash.com/photo-1459865264687-595d652de67e?auto=format&fit=crop&w=300&q=80",
      venue_cost: 1800
    } as any
  ],
  Badminton: [
    {
      id: "bad_indiranagar",
      name: "Indiranagar Badminton Hub",
      costPerPerson: 150,
      timeSlots: [
        { label: "6:00 AM - 7:00 AM", iso: "06:00" },
        { label: "7:00 AM - 8:00 AM", iso: "07:00" },
        { label: "8:00 AM - 9:00 AM", iso: "08:00" },
        { label: "6:00 PM - 7:00 PM", iso: "18:00" },
        { label: "7:00 PM - 8:00 PM", iso: "19:00" },
        { label: "8:00 PM - 9:00 PM", iso: "20:00" },
      ],
      tags: ["Indoor", "Synthetic Court", "Racket Rent"],
      distance: "3.1 km",
      image: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=300&q=80",
      venue_cost: 600
    } as any,
    {
      id: "bad_jpnagar",
      name: "JP Nagar Sports Club",
      costPerPerson: 130,
      timeSlots: [
        { label: "6:00 AM - 7:00 AM", iso: "06:00" },
        { label: "7:00 AM - 8:00 AM", iso: "07:00" },
        { label: "6:00 PM - 7:00 PM", iso: "18:00" },
        { label: "7:00 PM - 8:00 PM", iso: "19:00" },
      ],
      tags: ["Indoor", "Wooden Court", "Shower Rooms"],
      distance: "4.5 km",
      image: "https://images.unsplash.com/photo-1521537634581-0dced2fee2ef?auto=format&fit=crop&w=300&q=80",
      venue_cost: 500
    } as any
  ],
  Basketball: [
    {
      id: "bask_koramangala",
      name: "Koramangala Indoor Court",
      costPerPerson: 250,
      timeSlots: [
        { label: "5:00 PM - 6:00 PM", iso: "17:00" },
        { label: "6:00 PM - 7:00 PM", iso: "18:00" },
        { label: "7:00 PM - 8:00 PM", iso: "19:00" },
      ],
      tags: ["Indoor Hardwood", "Electronic Scoreboard"],
      distance: "1.0 km",
      image: "https://images.unsplash.com/photo-1544698310-74ea9d1c8258?auto=format&fit=crop&w=300&q=80",
      venue_cost: 1500
    } as any,
    {
      id: "bask_whitefield",
      name: "Whitefield Basketball Arena",
      costPerPerson: 220,
      timeSlots: [
        { label: "6:00 PM - 7:00 PM", iso: "18:00" },
        { label: "7:00 PM - 8:00 PM", iso: "19:00" },
        { label: "8:00 PM - 9:00 PM", iso: "20:00" },
      ],
      tags: ["Outdoor Floodlit", "Locker Rooms"],
      distance: "8.2 km",
      image: "https://images.unsplash.com/photo-1519766304817-4f37bda74a27?auto=format&fit=crop&w=300&q=80",
      venue_cost: 1200
    } as any
  ]
};

export const VenueStep = ({
  selectedSport,
  selectedVenue,
  setSelectedVenue,
  setCreateFlowStep,
  onNext,
}: VenueStepProps) => {
  const venues = VENUES_DB[selectedSport] || [];

  return (
    <div className="space-y-6 animate-fade-in text-left flex flex-col justify-between min-h-[520px]">
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => setCreateFlowStep("SPORT")}
          className="text-xs font-mono font-medium text-zinc-500 hover:text-zinc-200 flex items-center gap-1.5 cursor-pointer py-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <div>
          <h2 className="text-xl font-bold font-sans text-white">Where?</h2>
          <p className="text-xs text-zinc-500 font-mono mt-1">SELECT A VENUE</p>
        </div>

        <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
          {venues.map((venue) => {
            const isSelected = selectedVenue?.id === venue.id;
            return (
              <div
                key={venue.id}
                onClick={() => setSelectedVenue(venue)}
                className={`relative rounded-xl border overflow-hidden cursor-pointer transition-all duration-300 bg-zinc-950/40 hover:bg-zinc-900/20 ${
                  isSelected
                    ? "border-brand-peach/80 bg-zinc-900/60 scale-[1.01]"
                    : "border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <img
                  src={venue.image}
                  alt={venue.name}
                  className="w-full h-32 object-cover"
                />
                <div className="p-3.5 space-y-1 bg-zinc-900/40 backdrop-blur-sm border-t border-zinc-900">
                  <div className="flex justify-between items-start">
                    <h3 className="text-sm font-bold font-sans text-zinc-200 truncate pr-6 uppercase tracking-wider">
                      {venue.name}
                    </h3>
                    <span className="text-[9px] font-mono text-zinc-500 flex items-center gap-1 mt-0.5 whitespace-nowrap">
                      <MapPin className="w-2.5 h-2.5 text-brand-peach" />
                      {venue.distance} away
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] font-mono text-zinc-300 font-black">
                      ₹{venue.venue_cost} total
                    </span>
                    <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">
                      Cost per slot
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {venue.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[8px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono uppercase"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {isSelected && (
                  <div className="absolute top-3.5 right-3.5 w-5 h-5 bg-[#ff5e3a] rounded-full flex items-center justify-center animate-fade-in shadow-md">
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
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-2">
        <CreatePlanCTAButton
          text={selectedVenue ? `NEXT — CHOOSE TIMING →` : "SELECT A VENUE"}
          disabled={!selectedVenue}
          onPress={onNext}
        />
      </div>
    </div>
  );
};

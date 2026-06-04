import React from "react";
import { ArrowLeft, Edit3 } from "lucide-react";
import { CreatePlanCTAButton } from "../../app/src/features/create/components/active/CreatePlanCTAButton";
import { ActivityVenue, ActivityTimeSlot } from "../../app/src/core/types";

interface ReviewPlanStepProps {
  selectedSport: "Football" | "Badminton" | "Basketball";
  selectedVenue: ActivityVenue | null;
  selectedSlot: ActivityTimeSlot | null;
  requiredConfirmations: number;
  selectedCircleIds: string[];
  selectedFriendIds: string[];
  circles: any[];
  dbUsers: any[];
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export const ReviewPlanStep = ({
  selectedSport,
  selectedVenue,
  selectedSlot,
  requiredConfirmations,
  selectedCircleIds,
  selectedFriendIds,
  circles,
  dbUsers,
  onBack,
  onSubmit,
  isSubmitting,
}: ReviewPlanStepProps) => {
  const venueCost = selectedVenue?.venue_cost || 0;
  const costPerPerson = requiredConfirmations > 0 ? Math.round(venueCost / requiredConfirmations) : 0;
  const inviteeCount = selectedCircleIds.length + selectedFriendIds.length;

  return (
    <div className="space-y-6 animate-fade-in text-left flex flex-col justify-between min-h-[520px]">
      <div className="space-y-6">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-mono font-medium text-zinc-550 hover:text-zinc-200 flex items-center gap-1.5 cursor-pointer py-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <div>
          <h2 className="text-xl font-bold font-sans text-white">Review Plan</h2>
          <p className="text-xs text-zinc-500 font-mono mt-1">FINAL CHECKPOINT BEFORE POSTING</p>
        </div>

        {/* Plan card summary */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 space-y-4">
          <div className="flex justify-between items-start border-b border-zinc-900 pb-3">
            <div>
              <span className="text-[10px] font-mono text-brand-peach font-bold uppercase tracking-wider">
                {selectedSport}
              </span>
              <h3 className="text-base font-bold text-white mt-0.5">{selectedVenue?.name}</h3>
              <p className="text-xs text-zinc-400 mt-1 font-sans flex items-center gap-1.5">
                {selectedSlot?.label}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <span className="text-zinc-500 block uppercase tracking-widest text-[9px]">Confirmations</span>
              <span className="text-zinc-200 font-bold text-sm block mt-0.5">{requiredConfirmations} going</span>
            </div>
            <div>
              <span className="text-zinc-500 block uppercase tracking-widest text-[9px]">Invited</span>
              <span className="text-zinc-200 font-bold text-sm block mt-0.5">{inviteeCount} groups/friends</span>
            </div>
          </div>

          {/* Pricing calculations */}
          <div className="bg-zinc-900/40 rounded-lg p-3 space-y-2 border border-zinc-800/50">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400">Total Venue Cost:</span>
              <span className="font-mono text-zinc-200">₹{venueCost}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400">Split Share (at threshold):</span>
              <span className="font-mono text-zinc-200">₹{costPerPerson}/person</span>
            </div>
            <div className="flex justify-between items-center border-t border-zinc-800 pt-2 text-sm font-bold">
              <span className="text-white">Estimated Share:</span>
              <span className="text-brand-peach font-mono">₹{costPerPerson}/person</span>
            </div>
          </div>

          <div className="text-[10px] text-zinc-500 font-mono text-center pt-1 leading-relaxed">
            No charge right now. Booking opens when confirmations threshold is met.
          </div>
        </div>
      </div>

      <div className="pt-2">
        <CreatePlanCTAButton
          text={isSubmitting ? "POSTING PLAN..." : "SPAWN CO-ORDINATION PLAN"}
          disabled={isSubmitting}
          onPress={onSubmit}
        />
      </div>
    </div>
  );
};

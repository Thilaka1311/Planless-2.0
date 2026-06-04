import React from "react";
import { ArrowLeft, Clock, Lock } from "lucide-react";
import { CreatePlanCTAButton } from "../../app/src/features/create/components/active/CreatePlanCTAButton";
import { ActivityVenue, ActivityTimeSlot } from "../../app/src/core/types";

interface SlotStepProps {
  selectedVenue: ActivityVenue | null;
  selectedSlot: ActivityTimeSlot | null;
  setSelectedSlot: (slot: ActivityTimeSlot) => void;
  setCreateFlowStep: (step: any) => void;
  onNext: () => void;
}

export const SlotStep = ({
  selectedVenue,
  selectedSlot,
  setSelectedSlot,
  setCreateFlowStep,
  onNext,
}: SlotStepProps) => {
  const slots = selectedVenue?.timeSlots || [];

  return (
    <div className="space-y-6 animate-fade-in text-left flex flex-col justify-between min-h-[520px]">
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => setCreateFlowStep("VENUE")}
          className="text-xs font-mono font-medium text-zinc-550 hover:text-zinc-200 flex items-center gap-1.5 cursor-pointer py-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <div>
          <h2 className="text-xl font-bold font-sans text-white">When?</h2>
          <p className="text-xs text-zinc-500 font-mono mt-1">CHOOSE AN AVAILABLE TIME SLOT</p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {slots.map((slot) => {
            const isSelected = selectedSlot?.iso === slot.iso;
            const isLocked = slot.locked === true;

            return (
              <button
                key={slot.iso}
                type="button"
                disabled={isLocked}
                onClick={() => setSelectedSlot(slot)}
                className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition-all duration-300 relative overflow-hidden ${
                  isLocked
                    ? "border-zinc-900 bg-zinc-950/20 text-zinc-700 cursor-not-allowed opacity-50"
                    : isSelected
                    ? "border-brand-peach/80 bg-zinc-900/60 shadow-lg scale-[1.01]"
                    : "border-zinc-800 hover:border-zinc-700 bg-zinc-950/40 hover:bg-zinc-900/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Clock className={`w-4 h-4 ${isSelected ? "text-brand-peach" : "text-zinc-500"}`} />
                  <span className={`text-sm font-bold font-sans ${isSelected ? "text-white" : "text-zinc-300"}`}>
                    {slot.label}
                  </span>
                </div>

                <div>
                  {isLocked ? (
                    <div className="flex items-center gap-1 text-[9px] font-mono text-rose-500 uppercase tracking-widest">
                      <Lock className="w-3 h-3" />
                      <span>Booked</span>
                    </div>
                  ) : (
                    isSelected && (
                      <div className="w-5 h-5 bg-[#ff5e3a] rounded-full flex items-center justify-center animate-fade-in shadow-md">
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
                    )
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-2">
        <CreatePlanCTAButton
          text={selectedSlot ? `NEXT — INVITE PEOPLE →` : "SELECT A TIME SLOT"}
          disabled={!selectedSlot}
          onPress={onNext}
        />
      </div>
    </div>
  );
};

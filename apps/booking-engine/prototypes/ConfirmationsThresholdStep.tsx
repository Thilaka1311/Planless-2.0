import React from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { CreatePlanCTAButton } from "../active/CreatePlanCTAButton";

interface ConfirmationsThresholdStepProps {
  requiredConfirmations: number;
  setRequiredConfirmations: (count: number) => void;
  maxPeopleAllowed: number;
  setCreateFlowStep: (step: any) => void;
  onNext: () => void;
}

export const ConfirmationsThresholdStep = ({
  requiredConfirmations,
  setRequiredConfirmations,
  maxPeopleAllowed,
  setCreateFlowStep,
  onNext,
}: ConfirmationsThresholdStepProps) => {
  // We can let them select from 2 up to maxPeopleAllowed (or a default range of 2 to 10)
  const options = Array.from({ length: Math.min(10, Math.max(requiredConfirmations, maxPeopleAllowed)) - 1 }, (_, i) => i + 2);

  return (
    <div className="space-y-6 animate-fade-in text-left flex flex-col justify-between min-h-[520px]">
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => setCreateFlowStep("RECIPIENTS")}
          className="text-xs font-mono font-medium text-zinc-550 hover:text-zinc-200 flex items-center gap-1.5 cursor-pointer py-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <div>
          <h2 className="text-xl font-bold font-sans text-white">How many confirmations?</h2>
          <p className="text-xs text-zinc-500 font-mono mt-1">MINIMUM PEOPLE REQUIRED TO BOOK</p>
        </div>

        <div className="space-y-4">
          <p className="text-xs text-zinc-400 font-sans leading-relaxed">
            The plan will transition to <span className="text-brand-peach font-bold font-mono">BOOKING READY</span> as soon as this number of invited participants accept.
          </p>

          <div className="grid grid-cols-5 gap-2">
            {options.map((count) => {
              const isSelected = requiredConfirmations === count;
              return (
                <button
                  key={count}
                  type="button"
                  onClick={() => setRequiredConfirmations(count)}
                  className={`p-3 rounded-lg border text-center transition-all duration-200 font-mono font-bold text-sm ${
                    isSelected
                      ? "border-brand-peach bg-brand-peach/10 text-white shadow-lg"
                      : "border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  {count}
                </button>
              );
            })}
          </div>

          <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-950/20 flex gap-3 items-start mt-4">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-xs font-bold text-zinc-200 block">Host Decision Booking</span>
              <p className="text-[10px] text-zinc-500 font-mono leading-relaxed">
                Reaching this threshold triggers a booking notification. You as the host explicitly tap "Book Now" to confirm and pay.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <CreatePlanCTAButton
          text={`NEXT — REVIEW PLAN →`}
          disabled={requiredConfirmations < 2}
          onPress={onNext}
        />
      </div>
    </div>
  );
};

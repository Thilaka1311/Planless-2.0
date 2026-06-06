import React from "react";
import { ArrowLeft, Clock } from "lucide-react";
import { CreatePlanCTAButton } from "./active/CreatePlanCTAButton";
import { PlanSummary } from "./active/PlanSummary";

interface ResponseCutoffStepProps {
  responseCutoffHours: number;
  setResponseCutoffHours: (hours: number) => void;
  newPlanIsoDateTime: string;
  setCreateFlowStep: (step: any) => void;
  summary?: {
    title: string;
    location?: string;
    time?: string;
    invitedCount: number;
    cost: string;
    waitlistEnabled?: boolean;
    joinLimit?: number;
  };
}

export const ResponseCutoffStep = ({
  responseCutoffHours,
  setResponseCutoffHours,
  newPlanIsoDateTime,
  setCreateFlowStep,
  summary,
}: ResponseCutoffStepProps) => {

  const getDeadlineDisplay = (isoStr: string, cutoffHours: number) => {
    if (!isoStr) return "TBD";
    // Fall back to 1 hour calculation if empty/invalid
    const hoursToSub = (isNaN(cutoffHours) || cutoffHours < 1 || cutoffHours > 24) ? 1 : cutoffHours;
    try {
      const date = new Date(isoStr);
      date.setHours(date.getHours() - hoursToSub);

      const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
      const timeStr = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      });
      return `${weekday} ${timeStr}`;
    } catch (err) {
      return "TBD";
    }
  };

  const getPlanTimeDisplay = (isoStr: string) => {
    if (!isoStr) return "TBD";
    try {
      const date = new Date(isoStr);
      const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
      const timeStr = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      });
      return `${weekday} ${timeStr}`;
    } catch (err) {
      return "TBD";
    }
  };

  const planTimeStr = getPlanTimeDisplay(newPlanIsoDateTime);
  const deadlineStr = getDeadlineDisplay(newPlanIsoDateTime, responseCutoffHours);
  const isValid = responseCutoffHours >= 1 && responseCutoffHours <= 24;

  return (
    <div className="space-y-6 animate-fade-in text-left flex flex-col justify-between min-h-[500px]">
      <div className="space-y-6">
        {/* Back */}
        <button
          type="button"
          onClick={() => setCreateFlowStep("WHO")}
          className="text-xs font-mono font-medium text-zinc-550 hover:text-zinc-200 flex items-center gap-1.5 cursor-pointer py-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Circles</span>
        </button>

        {summary && (
          <PlanSummary
            title={summary.title}
            location={summary.location}
            time={summary.time}
            invitedCount={summary.invitedCount}
            cost={summary.cost}
            waitlistEnabled={summary.waitlistEnabled}
            joinLimit={summary.joinLimit}
          />
        )}

        <div className="space-y-1">
          <h2 className="text-xl font-bold font-sans text-white">
            When should responses close?
          </h2>
        </div>

        {/* Plan Reference Time */}
        <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl px-4 py-3.5 flex justify-between items-center text-xs">
          <span className="text-zinc-500 font-sans">Plan Starts</span>
          <span className="font-mono text-zinc-300 font-semibold">{planTimeStr}</span>
        </div>

        {/* Slider Section */}
        <div className="space-y-3 pt-2 text-left">
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-500 font-sans">Hours Before Start</span>
            <span className="text-brand-peach font-mono font-bold text-sm">{responseCutoffHours || 1}h</span>
          </div>
          <input
            type="range"
            min={1}
            max={24}
            value={responseCutoffHours || 1}
            onChange={(e) => setResponseCutoffHours(Number(e.target.value))}
            className="w-full accent-[#ff8b66] cursor-pointer h-1.5"
          />
          <div className="flex justify-between text-[9px] font-mono text-zinc-650 leading-none">
            <span>1h</span>
            <span>24h</span>
          </div>
        </div>

        {/* Highlighted Card */}
        <div className="bg-[#ff8b66]/10 border border-[#ff8b66]/20 rounded-2xl p-4 flex flex-col justify-center space-y-2 animate-fade-in">
          <div className="text-[10px] font-mono uppercase tracking-wider text-brand-peach/85 block font-bold">
            Responses Close
          </div>
          <div className="text-2xl font-black text-white tracking-tight font-sans">
            {deadlineStr}
          </div>
        </div>
      </div>

      <div className="pt-6">
        <CreatePlanCTAButton
          text="NEXT — BUDGET & COST →"
          disabled={responseCutoffHours < 1 || responseCutoffHours > 24}
          onPress={() => setCreateFlowStep("COST")}
        />
      </div>
    </div>
  );
};

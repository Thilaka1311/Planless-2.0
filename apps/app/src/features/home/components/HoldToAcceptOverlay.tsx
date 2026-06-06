import React from "react";
import { motion } from "motion/react";
import { Plan } from "../../../core/types";

interface HoldToAcceptOverlayProps {
  plan: Plan;
  holdProgress: number;
  isHolding: boolean;
  isFull: boolean;
  formattedDateAndTime: string;
}

export const HoldToAcceptOverlay: React.FC<HoldToAcceptOverlayProps> = ({
  plan,
  holdProgress,
  isHolding,
  isFull,
  formattedDateAndTime,
}) => {
  if (!isHolding) return null;

  const costOpacity = Math.max(0, Math.min(1, (holdProgress - 15) / 25));
  const costY = 16 * (1 - costOpacity);
  const timeOpacity = Math.max(0, Math.min(1, (holdProgress - 40) / 25));
  const timeY = 16 * (1 - timeOpacity);
  const locOpacity = Math.max(0, Math.min(1, (holdProgress - 65) / 25));
  const locY = 16 * (1 - locOpacity);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex flex-col justify-between p-8 pointer-events-none"
      style={{
        backgroundColor: `rgba(4, 4, 6, ${0.4 + (holdProgress / 100) * 0.45})`,
        backdropFilter: `blur(${(holdProgress / 100) * 8}px)`,
        WebkitBackdropFilter: `blur(${(holdProgress / 100) * 8}px)`,
      }}
    >
      <div className="h-6" />

      <div className="flex-1 flex flex-col justify-center space-y-7 my-auto pt-6">
        <div
          style={{
            opacity: costOpacity,
            transform: `translateY(${costY}px)`,
            transition: "opacity 0.1s ease-out, transform 0.1s ease-out",
          }}
          className="space-y-1"
        >
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block font-medium">
            Split Requirement
          </span>
          <div className="text-2xl font-black text-white flex items-baseline gap-1">
            <span>{plan.cost > 0 ? `₹${plan.cost}` : "Free Entry"}</span>
            <span className="text-zinc-500 text-xs font-normal lowercase">
              per person split
            </span>
          </div>
        </div>

        <div
          style={{
            opacity: timeOpacity,
            transform: `translateY(${timeY}px)`,
            transition: "opacity 0.1s ease-out, transform 0.1s ease-out",
          }}
          className="space-y-1"
        >
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block font-medium">
            Scheduled Hour
          </span>
          <div className="text-xl font-bold text-white uppercase tracking-tight">
            {formattedDateAndTime}
          </div>
        </div>

        <div
          style={{
            opacity: locOpacity,
            transform: `translateY(${locY}px)`,
            transition: "opacity 0.1s ease-out, transform 0.1s ease-out",
          }}
          className="space-y-1"
        >
          <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest block font-medium">
            Coordinated Venue
          </span>
          <div className="text-base font-medium text-zinc-200 leading-snug tracking-wide">
            {plan.location}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center space-y-4 w-full pb-2">
        <div className="relative w-14 h-14 flex items-center justify-center">
          <svg className="w-14 h-14 transform -rotate-90">
            <circle
              cx="28"
              cy="28"
              r="24"
              className="stroke-zinc-900"
              strokeWidth="3.5"
              fill="transparent"
            />
            <circle
              cx="28"
              cy="28"
              r="24"
              className={isFull ? "stroke-amber-400" : "stroke-[#ff8b66]"}
              strokeWidth="3.5"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 24}
              strokeDashoffset={2 * Math.PI * 24 * (1 - holdProgress / 100)}
              strokeLinecap="round"
              style={{
                filter: isFull
                  ? "drop-shadow(0 0 6px rgba(245, 158, 11, 0.4))"
                  : "drop-shadow(0 0 6px rgba(255, 139, 102, 0.4))",
              }}
            />
          </svg>
          <span className="absolute text-[11px] font-mono text-white font-black">
            {Math.round(holdProgress)}%
          </span>
        </div>
      </div>
    </motion.div>
  );
};

import React from "react";
import { Wifi, Battery } from "lucide-react";

interface SimulatorStatusBarProps {
  currentTime: string;
}

export const SimulatorStatusBar = ({ currentTime }: SimulatorStatusBarProps) => {
  return (
    <div className="h-11 bg-black/95 text-white flex items-center justify-between px-7 relative shrink-0 z-50 select-none">
      
      {/* Left corner timezone */}
      <span className="text-[12px] font-semibold text-zinc-300 tracking-tight font-mono">
        {currentTime || "09:41 AM"}
      </span>

      {/* Dynamic device dynamic island notch */}
      <div className="w-28 h-5.5 bg-black border border-zinc-900 rounded-full absolute left-1/2 -translate-x-1/2 top-1.5 flex items-center justify-center group">
        <div className="w-2 h-2 bg-zinc-900 rounded-full absolute left-3.5" />
        <span className="text-[9px] font-mono text-zinc-800 uppercase tracking-widest hidden group-hover:block">PLNLSS</span>
      </div>

      {/* Right corner indicators */}
      <div className="flex items-center gap-1.5 text-zinc-300">
        <Wifi className="w-3.5 h-3.5" />
        <span className="text-[9px] font-mono font-medium tracking-wide">5G</span>
        <div className="flex items-center gap-[1px]">
          <Battery className="w-4 h-4 text-emerald-400 rotate-0" />
        </div>
      </div>
    </div>
  );
};

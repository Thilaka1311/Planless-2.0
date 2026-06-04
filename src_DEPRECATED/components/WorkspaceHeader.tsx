import React from "react";
import { Smartphone, RotateCcw } from "lucide-react";
import { UserProfile } from "../core/types";

interface WorkspaceHeaderProps {
  isSimulatorMode: boolean;
  setIsSimulatorMode: (val: boolean) => void;
  profile: UserProfile | null;
  handleLogoutReset: () => void;
}

export const WorkspaceHeader = ({
  isSimulatorMode,
  setIsSimulatorMode,
  profile,
  handleLogoutReset
}: WorkspaceHeaderProps) => {
  return (
    <header className="w-full max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4 py-3 pb-6 border-b border-zinc-900 shrink-0 z-20">
      <div className="space-y-1 text-center md:text-left">
        <div className="flex items-center justify-center md:justify-start gap-2">
          <span className="w-2.5 h-2.5 bg-brand-orange rounded-full animate-pulse" />
          <h1 className="text-xl font-display font-bold tracking-tight text-white uppercase sm:text-2xl">Planless Social</h1>
        </div>
        <p className="text-xs text-zinc-400 font-sans tracking-wide">
          Real-world spontaneous plans & circles of friends with Spotify-calm dark UI
        </p>
      </div>

      {/* Action controllers for the app previewer */}
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <button
          onClick={() => setIsSimulatorMode(!isSimulatorMode)}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 border cursor-pointer transition-all ${
            isSimulatorMode 
              ? "bg-zinc-900 border-zinc-800 text-brand-peach" 
              : "bg-transparent border-zinc-900 text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>{isSimulatorMode ? "Mobile Frame On" : "Frame-less Full"}</span>
        </button>

        {profile ? (
          <button
            onClick={handleLogoutReset}
            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-900 hover:bg-zinc-855 text-zinc-300 border border-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Flow</span>
          </button>
        ) : null}
      </div>
    </header>
  );
};

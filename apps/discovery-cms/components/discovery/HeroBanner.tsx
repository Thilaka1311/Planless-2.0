import React from "react";

interface HeroBannerProps {
  onActionClick: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onActionClick }) => {
  return (
    <div className="w-full rounded-3xl overflow-hidden relative bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 p-6 flex flex-col justify-between h-[180px] shadow-xl border border-cyan-300/20 group select-none">
      {/* Floating pool elements to match reference design */}
      <div className="absolute right-6 top-6 text-3xl animate-bounce duration-1000">🛟</div>
      <div className="absolute right-20 bottom-8 text-2.5xl animate-pulse">🏖️</div>
      <div className="absolute left-6 bottom-4 text-xl">🥽</div>
      <div className="absolute right-10 bottom-20 text-xl">🦆</div>
      
      <div className="space-y-1 z-10 max-w-[75%]">
        <span className="text-[9px] font-mono font-bold tracking-widest text-cyan-100 uppercase">Featured Experience</span>
        <h3 className="text-2xl font-display font-black text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] leading-none tracking-tight uppercase">
          SWIM SEASON IS HERE
        </h3>
        <p className="text-[10px] text-cyan-50 leading-relaxed font-sans line-clamp-2">
          Beat the heat with pool party slots. Grab your friends and splash.
        </p>
      </div>
      <div className="z-10">
        <button
          type="button"
          onClick={onActionClick}
          className="bg-white text-zinc-900 font-sans font-black text-[10px] px-4 py-2 rounded-full shadow-md hover:bg-zinc-100 transition-all uppercase tracking-wider active:scale-95 cursor-pointer"
        >
          Book Now &gt;
        </button>
      </div>
    </div>
  );
};

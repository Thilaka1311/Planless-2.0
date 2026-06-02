import React from "react";
import { Star } from "lucide-react";
import { DiscoveryItem } from "../../../../core/types/discovery";

interface CardProps {
  item: DiscoveryItem;
  onClick: () => void;
}

export const DiningCard: React.FC<CardProps> = ({ item, onClick }) => {
  let rating = "4.5";
  let distance = "1.0 km";
  if (item.badge) {
    const parts = item.badge.split("•");
    if (parts.length > 0) rating = parts[0].replace("★", "").trim();
    if (parts.length > 1) distance = parts[1].trim();
  }

  return (
    <div
      onClick={onClick}
      className="w-[240px] h-[160px] shrink-0 rounded-2xl relative overflow-hidden bg-zinc-950 border border-zinc-900/80 shadow-lg flex flex-col justify-between p-3.5 cursor-pointer hover:border-amber-500/30 hover:shadow-[0_0_15px_rgba(245,158,11,0.15)] transition-all duration-300 group select-none"
    >
      {item.image_url && (
        <img
          src={item.image_url}
          alt={item.title}
          className="absolute inset-0 w-full h-full object-cover opacity-55 group-hover:scale-102 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/50 to-transparent" />
      
      {/* Top Row: Rating Badge */}
      <div className="z-10 flex justify-end">
        <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono text-[9px] flex items-center gap-0.5 font-bold shadow-sm backdrop-blur-sm">
          <Star className="w-2.5 h-2.5 fill-current text-amber-400" />
          {rating}
        </span>
      </div>

      {/* Bottom Row: Name, Cuisine, Distance */}
      <div className="z-10 text-left space-y-0.5">
        <h4 className="text-xs font-display font-black text-white leading-tight uppercase truncate">
          {item.title}
        </h4>
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[9px] text-zinc-400 font-sans truncate max-w-[130px]">
            {item.subtitle || "Cafe & Desserts"}
          </p>
          <span className="text-[8px] font-mono text-amber-400 font-bold uppercase tracking-wider shrink-0">
            {distance}
          </span>
        </div>
      </div>
    </div>
  );
};

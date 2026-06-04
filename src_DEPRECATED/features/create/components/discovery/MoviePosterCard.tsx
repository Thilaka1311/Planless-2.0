import React from "react";
import { DiscoveryItem } from "../../../../core/types/discovery";

interface CardProps {
  item: DiscoveryItem;
  onClick: () => void;
}

export const MoviePosterCard: React.FC<CardProps> = ({ item, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="w-[190px] h-[300px] shrink-0 rounded-2xl relative overflow-hidden bg-zinc-950 border border-zinc-900/80 shadow-2xl flex flex-col justify-end p-4 cursor-pointer hover:border-indigo-500/30 hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all duration-300 group select-none"
    >
      {item.image_url && (
        <img
          src={item.image_url}
          alt={item.title}
          className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:scale-[1.03] transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/65 to-transparent" />
      <div className="z-10 text-left space-y-1">
        <h4 className="text-sm font-display font-black text-white leading-tight uppercase tracking-tight line-clamp-2">
          {item.title}
        </h4>
        {item.subtitle && (
          <p className="text-[10px] text-indigo-200/70 font-sans line-clamp-2 leading-relaxed">
            {item.subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

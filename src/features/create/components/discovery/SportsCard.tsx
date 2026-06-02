import React from "react";
import { DiscoveryItem } from "../../../../core/types/discovery";

interface CardProps {
  item: DiscoveryItem;
  onClick: () => void;
}

export const SportsCard: React.FC<CardProps> = ({ item, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="w-[250px] h-[165px] shrink-0 rounded-2xl relative overflow-hidden bg-zinc-950 border border-zinc-900/80 shadow-lg flex flex-col justify-end p-4 cursor-pointer hover:border-emerald-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] transition-all duration-300 group select-none"
    >
      {item.image_url && (
        <img
          src={item.image_url}
          alt={item.title}
          className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-102 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/45 to-transparent" />
      <div className="z-10 text-left">
        <h4 className="text-xs font-display font-black text-white leading-tight uppercase tracking-tight truncate">
          {item.title}
        </h4>
        {item.subtitle && (
          <p className="text-[9px] text-emerald-200/75 mt-1 line-clamp-2 leading-snug font-sans">
            {item.subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

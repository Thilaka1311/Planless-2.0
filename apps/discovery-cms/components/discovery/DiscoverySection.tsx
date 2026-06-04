import React from "react";
import { DiscoverySection as DiscoverySectionType } from "../../../../../core/types/discovery";
import { DiscoveryCarousel } from "./DiscoveryCarousel";

interface DiscoverySectionProps {
  section: DiscoverySectionType;
  onItemSelect: (item: any) => void;
}

export const DiscoverySection: React.FC<DiscoverySectionProps> = ({ section, onItemSelect }) => {
  if (!section.items || section.items.length === 0) return null;

  let titleColor = "text-[#ff8b66]";
  const firstItemType = section.items[0]?.content_type;
  
  if (firstItemType === "movie") {
    titleColor = "text-indigo-400";
  } else if (firstItemType === "sport") {
    titleColor = "text-emerald-400";
  } else if (firstItemType === "dining") {
    titleColor = "text-amber-500";
  }

  return (
    <div className="space-y-3 pt-1">
      <h3 className={`text-[11.5px] font-mono uppercase tracking-widest ${titleColor} font-bold`}>
        {section.section_name}
      </h3>
      <DiscoveryCarousel items={section.items} onItemSelect={onItemSelect} />
    </div>
  );
};

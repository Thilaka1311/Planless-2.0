import React from "react";

interface DeveloperPanelSectionProps {
  title: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export const DeveloperPanelSection: React.FC<DeveloperPanelSectionProps> = ({
  title,
  actions,
  children,
}) => {
  return (
    <div className="border border-zinc-800/80 bg-zinc-950/40 rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
        <h3 className="text-[10px] font-mono font-black uppercase tracking-wider text-zinc-400">
          {title}
        </h3>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
      <div className="flex flex-col gap-2">
        {children}
      </div>
    </div>
  );
};

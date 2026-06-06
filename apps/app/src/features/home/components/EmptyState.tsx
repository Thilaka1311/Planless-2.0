import React from "react";

export const EmptyState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4">
      <span className="text-4xl text-zinc-650 animate-pulse">✨</span>
      <p className="text-zinc-400 font-sans text-xs max-w-xs leading-relaxed">
        You have joined all active plans! Head to the <strong className="text-brand-orange">Circles</strong> or <strong className="text-brand-orange">Plans Board</strong> tab to view and coordinate.
      </p>
    </div>
  );
};

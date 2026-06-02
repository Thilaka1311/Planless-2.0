import React from "react";
import { Plan, DbMemory, User } from "../../core/types";

interface StoryRecapModalProps {
  activeStoryRecap: Plan;
  onClose: () => void;
  dbMemories: DbMemory[];
  activeUserId: string;
  dbUsers: User[];
  storyIndex: number;
}

export default function StoryRecapModal({
  activeStoryRecap,
  onClose,
  dbMemories,
  activeUserId,
  dbUsers,
  storyIndex
}: StoryRecapModalProps) {
  // Resolve the active user's UUID from dbUsers so uploaded_by (which stores UUIDs) matches correctly
  const activeUserObj = dbUsers.find(u => u.user_id === activeUserId || u.id === activeUserId);
  const activeUuid = activeUserObj?.id || "";

  const storyMemories = dbMemories.filter(m => m.plan_id === activeStoryRecap.id || m.plan_id === activeStoryRecap.dbUuid);
  const activeSlides = storyMemories.length ? storyMemories.map(m => {
    // Match uploader by UUID first (canonical), fall back to short ID for legacy data
    const isMyMem = m.uploaded_by === activeUuid || m.uploaded_by === activeUserId;
    // Find uploader: check by UUID (u.id) first, then short ID fallback
    const uploaderUser = dbUsers.find(u => u.id === m.uploaded_by || u.user_id === m.uploaded_by);
    const uploaderName = uploaderUser?.full_name || "Participant";
    return {
      image: m.media_url,
      caption: m.caption,
      footerText: isMyMem ? "Shared by You (Attendee)" : `Shared by ${uploaderName}`,
      isMyMem,
      originalMemory: m
    };
  }) : [
    {
      image: activeStoryRecap.coverImage,
      caption: `⚡ Spontaneous "${activeStoryRecap.title}" launched successfully!`,
      footerText: "Frictionless Planless Spark • Real-Life Meetup Complete",
      isMyMem: false
    }
  ];

  const currentSlideIndex = Math.min(storyIndex, activeSlides.length - 1);
  const currentSlide = activeSlides[currentSlideIndex] || activeSlides[0];

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col justify-between p-4 overflow-hidden animate-fade-in font-sans">
      <div className="w-full flex items-center gap-1 mt-2 z-20 select-none">
        {activeSlides.map((_, sIdx) => (
          <div key={sIdx} className="h-1 flex-1 bg-zinc-800 rounded-full overflow-hidden">
            <div className={`h-full bg-gradient-to-r from-[#ff8b66] to-[#ff5d41] transition-all duration-[4500ms] ease-linear ${sIdx <= currentSlideIndex ? "w-full" : "w-0"}`} />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-3 px-1 z-20">
        <div className="flex items-center gap-2.5 text-left">
          <div className="w-9 h-9 rounded-full overflow-hidden border border-[#ff8b66]/30 bg-zinc-900">
            <img src={activeStoryRecap.coverImage} className="w-full h-full object-cover" alt="plan" />
          </div>
          <div>
            <h4 className="text-xs font-sans font-bold text-zinc-100 uppercase tracking-wide leading-tight flex items-center gap-1.5">
              <span>{activeStoryRecap.title}</span>
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-full bg-black/60 border border-zinc-850 text-[10.5px] uppercase font-mono text-zinc-300 hover:text-white focus:outline-none"
          >
            ✓ Done
          </button>
        </div>
      </div>

      <div className="flex-1 my-4 flex items-center justify-center relative select-none">
        <div className="w-full max-w-sm h-full max-h-[62vh] rounded-[2.2rem] overflow-hidden border border-zinc-900 bg-zinc-950 relative flex flex-col justify-end p-5 shadow-2xl z-5 animate-slide-up">
          <img src={currentSlide.image} className="absolute inset-0 w-full h-full object-cover z-0" alt="active story" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/100 via-black/45 z-0" />
          
          <div className="relative z-10 text-left space-y-2">
            <span className="text-[9.5px] text-[#ff8b66] font-mono uppercase tracking-widest font-black block">{currentSlide.footerText}</span>
            <p className="text-sm font-sans font-extrabold text-zinc-100 tracking-wide leading-snug uppercase">"{currentSlide.caption}"</p>
          </div>
        </div>
      </div>
    </div>
  );
}

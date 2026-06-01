import React from "react";
import { ArrowLeft, Clock, MapPin, Landmark, Users } from "lucide-react";

interface CircleItem {
  id: string;
  name: string;
  groupImage?: string;
  avatars: string[];
  membersCount: number;
}

interface PlanPreviewStepProps {
  newPlanTitle: string;
  newPlanLocation: string;
  newPlanTime: string;
  newPlanCost: string;
  audienceType: "circle" | "friends" | "multiple";
  selectedCircleIds: string[];
  selectedFriendIds: string[];
  circles: CircleItem[];
  customPlanNotes: string;
  newPlanUploadedImage: string | null;
  setNewPlanUploadedImage: (val: string | null) => void;
  selectedExperience: {
    image: string;
  } | null;
  setCreateFlowStep: (step: "BROWSE" | "DETAILS" | "RECIPIENTS" | "EXTRA" | "PREVIEW") => void;
  handleHostPlanSubmit: () => void;
  isSubmitting: boolean;
}

export const PlanPreviewStep = ({
  newPlanTitle,
  newPlanLocation,
  newPlanTime,
  newPlanCost,
  audienceType,
  selectedCircleIds,
  selectedFriendIds,
  circles,
  customPlanNotes,
  newPlanUploadedImage,
  setNewPlanUploadedImage,
  selectedExperience,
  setCreateFlowStep,
  handleHostPlanSubmit,
  isSubmitting
}: PlanPreviewStepProps) => {
  const defaultCustomCover = "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=600";

  return (
    <div className="space-y-5 animate-fade-in text-left">
      <button
        type="button"
        onClick={() => setCreateFlowStep("EXTRA")}
        className="text-xs font-mono font-medium text-zinc-500 hover:text-zinc-200 flex items-center gap-1.5 cursor-pointer py-1"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to setups</span>
      </button>

      <div className="space-y-1">
        <h3 className="text-sm font-display font-semibold text-zinc-200">Review Slate Coordinate</h3>
        <p className="text-[11px] text-zinc-500 font-sans">Distraction-free summary preview cards. Host plan instantly.</p>
      </div>

      <div className="bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border border-zinc-850 rounded-3xl p-5 space-y-4 shadow-2xl relative select-none">
        <div className="relative w-full h-28 rounded-2xl overflow-hidden border border-zinc-900 bg-zinc-950">
          <img
            src={newPlanUploadedImage || selectedExperience?.image || defaultCustomCover}
            className="w-full h-full object-cover opacity-60"
            alt="Plan cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
          <span className="absolute bottom-3 left-3 bg-[#ff8b66]/20 backdrop-blur-md text-brand-peach font-mono font-bold text-[8px] uppercase tracking-widest px-3 py-1 rounded-full border border-brand-peach/30">
            SPONTANEOUS DRAFT
          </span>
        </div>

        <div className="space-y-3">
          <div className="space-y-0.5">
            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#ff8b66] font-bold">ACTIVITY COORDINATE</span>
            <h2 className="text-lg font-display font-black text-white tracking-tight leading-snug uppercase">
              {newPlanTitle || "Untitled Coordinate"}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-2 border-t border-b border-zinc-900/60 py-3">
            <div className="flex items-center gap-2.5">
              <Clock className="w-3.5 h-3.5 text-brand-peach shrink-0" />
              <span className="text-xs text-zinc-300 font-mono font-medium truncate">
                {newPlanTime || "TBD TIMINGS"}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <MapPin className="w-3.5 h-3.5 text-brand-peach shrink-0" />
              <span className="text-xs text-zinc-355 truncate">
                {newPlanLocation || "TBD COORDINATE VENUE"}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <Landmark className="w-3.5 h-3.5 text-zinc-550 shrink-0" />
              <span className="text-xs text-zinc-400 font-mono">
                {parseFloat(newPlanCost) > 0 ? (
                  <span className="text-[#ff8b66] font-semibold">₹{newPlanCost} split amount</span>
                ) : (
                  <span className="text-emerald-400 font-semibold">Bring Spontaneous Vibes (Free)</span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <Users className="w-3.5 h-3.5 text-zinc-550 shrink-0" />
              <span className="text-xs text-zinc-300 font-sans">
                {audienceType === "circle" && `Target Circle: ${circles.find(c => c.id === selectedCircleIds[0])?.name || "Workspace Circle"}`}
                {audienceType === "friends" && `Target: ${selectedFriendIds.length} specific friends`}
                {audienceType === "multiple" && `Multiple Blast: ${selectedCircleIds.length} group circles`}
              </span>
            </div>
          </div>

          {customPlanNotes.trim() && (
            <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-3 select-none text-left">
              <span className="text-[8px] font-mono text-zinc-550 block uppercase tracking-wider mb-1 font-extrabold">COORDINATORS NOTE</span>
              <p className="text-[11px] text-zinc-400 leading-relaxed italic font-serif">
                “{customPlanNotes.trim()}”
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-zinc-900 text-xs">
          <span className="text-[10px] text-zinc-500 font-mono">Tweak Banner cover?</span>
          <label className="text-[9px] font-mono text-[#ff8b66] hover:text-[#ffab8f] cursor-pointer bg-zinc-950/40 border border-zinc-850 px-2.5 py-1 rounded-lg">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = () => {
                    if (typeof reader.result === "string") {
                      setNewPlanUploadedImage(reader.result);
                    }
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
            <span>{newPlanUploadedImage ? "📷 Change image" : "📷 Upload file"}</span>
          </label>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleHostPlanSubmit();
        }}
        className="space-y-3"
      >
        <button
          id="host_plan_submit_btn"
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-4 rounded-xl bg-[#ff5d41] text-white font-display font-black text-xs uppercase tracking-widest hover:bg-opacity-80 active:scale-[0.99] transition-all text-center shadow-lg flex items-center justify-center gap-2 font-bold ${
            isSubmitting ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          <span>{isSubmitting ? "Hosting..." : "Host Plan"}</span>
        </button>
      </form>
    </div>
  );
};

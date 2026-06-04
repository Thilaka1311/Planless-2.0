import React from "react";
import { ArrowLeft, ChevronRight, MapPin, Clock, Users, IndianRupee, Sparkles } from "lucide-react";
import { CreatePlanCTAButton } from "./CreatePlanCTAButton";

type CreateStep = "WHAT" | "LOCATION" | "DATETIME" | "WHO" | "COST" | "REVIEW";

interface CircleItem {
  id: string;
  name: string;
  membersCount: number;
  avatars: string[];
}

interface PlanPreviewStepProps {
  newPlanTitle: string;
  setNewPlanTitle: (val: string) => void;
  newPlanLocation: string;
  newPlanTime: string;
  newPlanCost: string;
  customPlanNotes: string;
  audienceType: "circle" | "friends" | "multiple";
  selectedCircleIds: string[];
  selectedFriendIds: string[];
  circles: CircleItem[];
  dbUsers?: { user_id: string; full_name: string }[];
  selectedExperience: { image: string; category: string } | null;
  newPlanUploadedImage: string | null;
  setNewPlanUploadedImage: (val: string | null) => void;
  setCreateFlowStep: (step: CreateStep) => void;
  handleHostPlanSubmit: () => void;
  isSubmitting: boolean;
  onBack?: () => void;
}

const CATEGORY_EMOJI: Record<string, string> = {
  sports: "⚽",
  movies: "🎬",
  restaurants: "🍽️",
  custom: "✨",
};

const CATEGORY_COVER: Record<string, string> = {
  sports: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80",
  movies: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80",
  restaurants: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80",
  custom: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=600&q=80",
};

const PLACEHOLDERS: Record<string, string> = {
  sports: "Saturday Football",
  movies: "Movie Night",
  restaurants: "Dinner at Toit",
  custom: "Weekend Hangout",
};

export const PlanPreviewStep = ({
  newPlanTitle,
  setNewPlanTitle,
  newPlanLocation,
  newPlanTime,
  newPlanCost,
  customPlanNotes,
  audienceType,
  selectedCircleIds,
  selectedFriendIds,
  circles,
  dbUsers = [],
  selectedExperience,
  newPlanUploadedImage,
  setNewPlanUploadedImage,
  setCreateFlowStep,
  handleHostPlanSubmit,
  isSubmitting,
  onBack,
}: PlanPreviewStepProps) => {
  const category = selectedExperience?.category ?? "custom";
  const emoji = CATEGORY_EMOJI[category] ?? "✨";
  const coverImage = newPlanUploadedImage
    || selectedExperience?.image
    || CATEGORY_COVER[category]
    || CATEGORY_COVER.custom;

  const placeholder = PLACEHOLDERS[category] ?? PLACEHOLDERS.custom;

  // Build people summary
  const invitedCount = React.useMemo(() => {
    if (audienceType === "friends") return selectedFriendIds.length;
    return selectedCircleIds.reduce((sum, cid) => {
      const c = circles.find((x) => x.id === cid);
      return sum + (c ? c.membersCount : 0);
    }, 0);
  }, [audienceType, selectedFriendIds, selectedCircleIds, circles]);

  const peopleSummary = React.useMemo(() => {
    if (audienceType === "friends" && selectedFriendIds.length > 0) {
      const names = selectedFriendIds
        .slice(0, 3)
        .map((fid) => dbUsers.find((u) => u.user_id === fid)?.full_name ?? fid)
        .join(", ");
      return selectedFriendIds.length > 3 ? `${names} +${selectedFriendIds.length - 3} more` : names;
    }
    if ((audienceType === "circle" || audienceType === "multiple") && selectedCircleIds.length > 0) {
      const names = selectedCircleIds
        .slice(0, 2)
        .map((cid) => circles.find((c) => c.id === cid)?.name ?? cid)
        .join(", ");
      return selectedCircleIds.length > 2 ? `${names} +${selectedCircleIds.length - 2} more` : names;
    }
    return "No one added yet";
  }, [audienceType, selectedFriendIds, selectedCircleIds, circles, dbUsers]);

  const totalCost = parseFloat(newPlanCost) || 0;
  const denominator = invitedCount > 0 ? invitedCount + 1 : 1;
  const perPerson = totalCost > 0 ? Math.ceil(totalCost / denominator) : 0;

  const rows: { icon: React.ReactNode; label: string; value: string; step: CreateStep; highlight?: boolean }[] = [
    {
      icon: <span className="text-base">{emoji}</span>,
      label: "Activity",
      value: category.toUpperCase(),
      step: "WHAT",
    },
    {
      icon: <MapPin className="w-3.5 h-3.5" />,
      label: "Location",
      value: newPlanLocation || "Not set",
      step: "LOCATION",
    },
    {
      icon: <Clock className="w-3.5 h-3.5" />,
      label: "Date & Time",
      value: newPlanTime || "Not set",
      step: "DATETIME",
    },
    {
      icon: <Users className="w-3.5 h-3.5" />,
      label: "People",
      value: peopleSummary,
      step: "WHO",
    },
    {
      icon: <IndianRupee className="w-3.5 h-3.5" />,
      label: totalCost > 0 ? `₹${totalCost} total  ·  ₹${perPerson}/person` : "Cost",
      value: totalCost > 0 ? "" : "Free hang",
      step: "COST",
      highlight: totalCost > 0,
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in text-left">
      {/* Back */}
      <button
        type="button"
        onClick={onBack || (() => setCreateFlowStep("COST"))}
        className="text-xs font-mono font-medium text-zinc-550 hover:text-zinc-200 flex items-center gap-1.5 cursor-pointer py-1"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back</span>
      </button>

      <div className="space-y-1">
        <h2 className="text-xl font-bold font-sans text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-peach" /> Review Plan
        </h2>
      </div>

      {/* Plan Title Input */}
      <div className="space-y-2 bg-zinc-950/40 border border-zinc-900/60 rounded-2xl p-4">
        <label className="text-[10px] font-mono uppercase tracking-wider text-brand-peach block font-bold">
          Plan Title
        </label>
        <input
          type="text"
          placeholder={placeholder}
          value={newPlanTitle}
          onChange={(e) => setNewPlanTitle(e.target.value)}
          className="w-full bg-transparent border-b border-zinc-850 focus:border-brand-peach py-2 text-base text-zinc-100 placeholder-zinc-700 focus:outline-none transition-colors"
          autoFocus={!newPlanTitle}
        />
        <p className="text-[10px] text-zinc-500 font-sans">
          Give your plan a clear name.
        </p>
      </div>

      {/* Cover art */}
      <div className="relative w-full h-24 rounded-2xl overflow-hidden border border-zinc-900">
        <img src={coverImage} alt="cover" className="w-full h-full object-cover opacity-55" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute bottom-2.5 left-3.5 flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <span className="text-sm font-bold text-white uppercase tracking-wider">{newPlanTitle || "Untitled"}</span>
        </div>
        <label className="absolute top-2.5 right-2.5 text-[8px] font-mono text-brand-peach cursor-pointer bg-black/50 border border-brand-peach/30 px-2 py-1 rounded-lg">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = () => {
                  if (typeof reader.result === "string") setNewPlanUploadedImage(reader.result);
                };
                reader.readAsDataURL(file);
              }
            }}
          />
          📷 Cover
        </label>
      </div>

      {/* Editable summary rows */}
      <div className="bg-zinc-950/60 border border-zinc-900 rounded-3xl overflow-hidden divide-y divide-zinc-900/60">
        {rows.map((row, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setCreateFlowStep(row.step)}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-zinc-900/40 transition-colors group"
          >
            <span className={`shrink-0 ${row.highlight ? "text-brand-peach" : "text-zinc-500"}`}>
              {row.icon}
            </span>
            <div className="flex-1 min-w-0">
              <span className={`block text-xs font-semibold truncate ${row.highlight ? "text-brand-peach" : "text-zinc-200"}`}>
                {row.label}
              </span>
              {row.value && (
                <span className="block text-[10px] text-zinc-500 font-mono truncate mt-0.5">{row.value}</span>
              )}
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-400 shrink-0 transition-colors" />
          </button>
        ))}
      </div>

      {/* Notes preview */}
      {customPlanNotes.trim() && (
        <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl px-4 py-3">
          <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-wider block mb-1">Note</span>
          <p className="text-[11px] text-zinc-400 italic font-serif leading-relaxed">"{customPlanNotes.trim()}"</p>
        </div>
      )}

      <CreatePlanCTAButton
        id="host_plan_submit_btn"
        text={isSubmitting ? "POSTING..." : "POST PLAN →"}
        onPress={handleHostPlanSubmit}
        disabled={isSubmitting || newPlanTitle.trim().length === 0}
        loading={isSubmitting}
        variant="final"
      />
    </div>
  );
};

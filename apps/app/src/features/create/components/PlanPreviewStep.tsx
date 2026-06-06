import React from "react";
import { ArrowLeft, ChevronRight, MapPin, Clock, Users, IndianRupee, Sparkles } from "lucide-react";
import { CreatePlanCTAButton } from "./active/CreatePlanCTAButton";
import { PlanSummary } from "./active/PlanSummary";
import { calculateAttendanceSummary } from "./active/AttendanceSummaryCard";

type CreateStep = "WHAT" | "LOCATION" | "DATETIME" | "WHO" | "RESPONSE_CUTOFF" | "COST" | "REVIEW";

interface CircleItem {
  id: string;
  name: string;
  membersCount: number;
  avatars: string[];
  membersList?: { userId: string }[];
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
  responseCutoffHours?: number;
  newPlanIsoDateTime?: string;
  waitlistEnabled?: boolean;
  joinLimit?: number;
  activeUserId?: string | null;
  summary?: {
    title: string;
    location?: string;
    time?: string;
    invitedCount: number;
    cost: string;
    waitlistEnabled?: boolean;
    joinLimit?: number;
  };
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
  responseCutoffHours = 2,
  newPlanIsoDateTime,
  waitlistEnabled = false,
  joinLimit = 0,
  activeUserId = null,
  summary,
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
    const set = new Set<string>();

    selectedCircleIds.forEach((cid) => {
      const c = circles.find((x) => x.id === cid);
      if (c) {
        if (c.membersList) {
          c.membersList.forEach((m) => {
            if (m.userId && m.userId !== activeUserId) {
              set.add(m.userId);
            }
          });
        } else {
          const countWithoutHost = Math.max(0, c.membersCount - 1);
          for (let i = 0; i < countWithoutHost; i++) {
            set.add(`fallback_member_${cid}_${i}`);
          }
        }
      }
    });

    selectedFriendIds.forEach((fid) => {
      if (fid !== activeUserId) {
        set.add(fid);
      }
    });

    return set.size;
  }, [selectedCircleIds, selectedFriendIds, circles, activeUserId]);

  const peopleSummary = React.useMemo(() => {
    const parts: string[] = [];
    if (selectedCircleIds.length > 0) {
      const names = selectedCircleIds
        .map((cid) => circles.find((c) => c.id === cid)?.name ?? cid);
      parts.push(...names);
    }
    if (selectedFriendIds.length > 0) {
      const names = selectedFriendIds
        .map((fid) => dbUsers.find((u) => u.user_id === fid)?.full_name ?? fid);
      parts.push(...names);
    }
    if (parts.length === 0) return "No one added yet";
    const sliceCount = 3;
    const sliced = parts.slice(0, sliceCount).join(", ");
    return parts.length > sliceCount ? `${sliced} +${parts.length - sliceCount} more` : sliced;
  }, [selectedFriendIds, selectedCircleIds, circles, dbUsers]);

  const totalCost = parseFloat(newPlanCost) || 0;
  const { splitCount } = calculateAttendanceSummary({
    invitedParticipants: invitedCount,
    waitlistEnabled,
    joinLimit,
  });
  const perPerson = totalCost > 0 ? Math.ceil(totalCost / splitCount) : 0;

  // Calculate deadline date and format
  const deadlineStr = React.useMemo(() => {
    if (!newPlanIsoDateTime) return "TBD";
    try {
      const date = new Date(newPlanIsoDateTime);
      date.setHours(date.getHours() - responseCutoffHours);
      
      const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
      const timeStr = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      });
      return `${weekday} ${timeStr}`;
    } catch (err) {
      return "TBD";
    }
  }, [newPlanIsoDateTime, responseCutoffHours]);

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
      label: "Invited People",
      value: peopleSummary,
      step: "WHO",
    },
    {
      icon: <Clock className="w-3.5 h-3.5 text-amber-500" />,
      label: "Response Deadline",
      value: deadlineStr,
      step: "RESPONSE_CUTOFF",
    },
    {
      icon: <IndianRupee className="w-3.5 h-3.5" />,
      label: totalCost > 0 ? `₹${totalCost} total  ·  ₹${perPerson} each` : "Cost",
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

      {summary && (
        <PlanSummary
          title={summary.title}
          location={summary.location}
          time={summary.time}
          invitedCount={summary.invitedCount}
          cost={summary.cost}
          waitlistEnabled={summary.waitlistEnabled}
          joinLimit={summary.joinLimit}
        />
      )}

      <div className="space-y-1">
        <h2 className="text-xl font-bold font-sans text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-peach" /> Review Plan
        </h2>
      </div>

      {/* Unified Plan Preview Card */}
      <div className="bg-zinc-950/60 border border-zinc-900 rounded-3xl overflow-hidden divide-y divide-zinc-900/40">
        {/* Plan Title Input */}
        <div className="space-y-1 p-4 bg-zinc-950/20">
          <label className="text-[9px] font-mono uppercase tracking-wider text-brand-peach/80 block font-bold">
            Plan Title
          </label>
          <input
            type="text"
            placeholder={placeholder}
            value={newPlanTitle}
            onChange={(e) => setNewPlanTitle(e.target.value)}
            className="w-full bg-transparent border-b border-zinc-850/80 focus:border-brand-peach py-1 text-lg font-bold text-zinc-100 placeholder-zinc-700 focus:outline-none transition-colors"
            autoFocus={!newPlanTitle}
          />
        </div>

        {/* Editable summary rows */}
        <div className="divide-y divide-zinc-900/40">
          {rows.map((row, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCreateFlowStep(row.step)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-900/40 transition-colors group"
            >
              <span className={`shrink-0 ${row.highlight ? "text-brand-peach" : "text-zinc-500"}`}>
                {row.icon}
              </span>
              <div className="flex-1 min-w-0">
                <span className={`block text-xs font-semibold truncate ${row.highlight ? "text-brand-peach" : "text-zinc-200"}`}>
                  {row.label}
                </span>
                {row.value && (
                  <span className="block text-[10px] text-zinc-550 font-mono truncate mt-0.5">{row.value}</span>
                )}
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-400 shrink-0 transition-colors" />
            </button>
          ))}
        </div>

        {/* Notes preview */}
        {customPlanNotes.trim() && (
          <div className="px-4 py-3 bg-zinc-950/20">
            <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-wider block mb-1">Note</span>
            <p className="text-[11px] text-zinc-400 italic font-serif leading-relaxed">"{customPlanNotes.trim()}"</p>
          </div>
        )}
      </div>

      <CreatePlanCTAButton
        id="host_plan_submit_btn"
        text={isSubmitting ? "POSTING..." : "POST PLAN"}
        onPress={handleHostPlanSubmit}
        disabled={isSubmitting || newPlanTitle.trim().length === 0}
        loading={isSubmitting}
        variant="final"
      />
    </div>
  );
};


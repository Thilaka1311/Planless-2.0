import React, { useState } from "react";
import { ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { Plan } from "../../../core/types";
import { usePlansStore } from "../state/PlansContext";
import { useProfileStore } from "../../profile/state/ProfileContext";
import { useCirclesStore } from "../../circles/state/CirclesContext";

interface PlansScreenProps {
  setSelectedPlan: (plan: Plan | null) => void;
  passedByPlanId?: Record<string, string[]>;
}

export const PlansScreen = ({
  setSelectedPlan,
  passedByPlanId = {},
}: PlansScreenProps) => {
  const { plans, dbPlanParticipants } = usePlansStore();
  const { userProfile, activeUserId } = useProfileStore();
  const { circles } = useCirclesStore();

  const [plansFilter, setPlansFilter] = useState<"all" | "going" | "waitlist" | "passed" | "hosted">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const SEGMENTS = [
    { key: "going" as const, label: "Going" },
    { key: "waitlist" as const, label: "Waitlist" },
    { key: "passed" as const, label: "Passed" },
    { key: "hosted" as const, label: "Hosted" },
  ];

  const emptyMessages: Record<string, string> = {
    going: "No upcoming plans yet",
    waitlist: "No waitlisted plans currently",
    passed: "No past plans to show",
    hosted: "You haven't hosted a plan yet",
  };

  const getTimelineSection = (plan: Plan) => {
    const dt = plan.date.toUpperCase();
    if (dt.includes("TODAY")) return "Today";
    if (dt.includes("TOMORROW")) return "Tomorrow";
    return "This Week";
  };

  const parseTimeToMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 0;
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const ampm = match[3].toUpperCase();
    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const getDayIndex = (dateStr: string) => {
    const d = dateStr.toUpperCase();
    if (d.includes("MON")) return 1;
    if (d.includes("TUE")) return 2;
    if (d.includes("WED")) return 3;
    if (d.includes("THU")) return 4;
    if (d.includes("FRI")) return 5;
    if (d.includes("SAT")) return 6;
    if (d.includes("SUN")) return 7;
    return 8;
  };

  const userUuid = userProfile?.dbUuid || "";
  console.log(`[PlansScreen Visibility Filter] Current user UUID: "${userUuid}"`);

  const involvedPlans = plans.filter(p => {
    // A user is involved if they are in the plan's members list matching by UUID
    const isParticipant = p.members.some(
      m => m.userUuid && m.userUuid === userUuid
    );
    if (!isParticipant) {
      console.log(`[PlansScreen EXCLUDED] Plan: "${p.title}" (ID: ${p.id}) - Current user UUID "${userUuid}" is not a participant/host.`);
    }
    return isParticipant;
  });

  const visiblePlanIds = involvedPlans.map(p => p.id);
  const matchingDbParticipants = dbPlanParticipants.filter(pp => pp.user_id === userUuid);
  console.log(`[PlansScreen INVOLVED] Visible plan IDs:`, visiblePlanIds);
  console.log(`[PlansScreen INVOLVED] Participant records used:`, matchingDbParticipants);

  // Filter plans based on searchQuery and plansFilter
  const filteredPlans = involvedPlans.filter((p) => {
    const planCircle = p.circleId ? circles.find((c) => c.id === p.circleId) : null;
    const circleName = planCircle?.name || "";
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      circleName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (plansFilter === "all") return true;

    const myParticipant = dbPlanParticipants.find(
      (pp) => pp.plan_id === p.id && pp.user_id === userUuid
    );
    const isGoing = myParticipant?.status === "going";
    const isWaitlisted =
      myParticipant?.status === "waitlist" ||
      (p.waitlistUsers || []).some((u) => u.name === userProfile.name) ||
      (p.interestedUsers || []).some((u) => u.name === userProfile.name);
    const isHosted = p.creatorId === "u_self" || p.creatorName === userProfile.name;
    const autoPassed = (passedByPlanId[p.id] || []).includes(userProfile.name);

    let match = false;
    if (plansFilter === "going") match = isGoing && !p.isHappened && !autoPassed;
    else if (plansFilter === "waitlist") match = isWaitlisted && !p.isHappened;
    else if (plansFilter === "passed") {
      const historicallyJoined = p.isHappened && (isGoing || isWaitlisted);
      match = autoPassed || historicallyJoined;
    }
    else if (plansFilter === "hosted") match = isHosted;

    console.log(`[PlansScreen Tab Classification] Plan: "${p.title}"`);
    console.log(`- Participant status from DB: ${myParticipant?.status || "none"}`);
    console.log(`- Flags: isGoing=${isGoing}, isWaitlisted=${isWaitlisted}, isHosted=${isHosted}, isHappened=${p.isHappened}`);
    console.log(`- Tab Filter: "${plansFilter}" -> Classification Result: ${match}`);

    return match;
  });

  const todayPlans = filteredPlans
    .filter((p) => getTimelineSection(p) === "Today")
    .sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));

  const tomorrowPlans = filteredPlans
    .filter((p) => getTimelineSection(p) === "Tomorrow")
    .sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));

  const thisWeekPlans = filteredPlans
    .filter((p) => getTimelineSection(p) === "This Week")
    .sort((a, b) => {
      const dayA = getDayIndex(a.date);
      const dayB = getDayIndex(b.date);
      if (dayA !== dayB) return dayA - dayB;
      return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
    });

  // Filter button active color classes (synced to filter type)
  const getFilterTriggerClass = (key: string) => {
    switch (key) {
      case "going":
        return "bg-emerald-500/12 border-emerald-500/25 text-emerald-400";
      case "waitlist":
        return "bg-amber-500/12 border-amber-500/25 text-amber-400";
      case "passed":
        return "bg-rose-500/12 border-rose-500/25 text-rose-400";
      case "hosted":
        return "bg-white/8 border-white/15 text-zinc-200";
      default:
        return "bg-zinc-900/50 border-white/[0.04] text-zinc-400";
    }
  };

  const getFilterBtnClass = (key: string, active: boolean) => {
    const base =
      "flex-1 py-2 rounded-xl text-[10px] font-sans font-semibold transition-all duration-200 border cursor-pointer select-none text-center tracking-wide";
    if (!active) {
      return `${base} bg-transparent border-transparent text-zinc-600 hover:text-zinc-400`;
    }
    switch (key) {
      case "going":
        return `${base} bg-emerald-500/15 border-emerald-500/25 text-emerald-400`;
      case "waitlist":
        return `${base} bg-amber-500/15 border-amber-500/25 text-amber-400`;
      case "passed":
        return `${base} bg-rose-500/15 border-rose-500/25 text-rose-400`;
      case "hosted":
        return `${base} bg-white/10 border-white/20 text-white`;
      default:
        return `${base} bg-white/10 border-white/20 text-white`;
    }
  };

  // Status badge config per filter
  const getStatusBadge = (key: string) => {
    switch (key) {
      case "going":
        return {
          label: "Going ✓",
          cls: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
          bar: "bg-emerald-500",
        };
      case "waitlist":
        return {
          label: "Waitlisted",
          cls: "bg-amber-500/20 border-amber-500/40 text-amber-300",
          bar: "bg-amber-500",
        };
      case "passed":
        return {
          label: "Passed",
          cls: "bg-rose-500/15 border-rose-500/30 text-rose-400",
          bar: "bg-rose-500",
        };
      case "hosted":
        return {
          label: "Hosted ★",
          cls: "bg-white/12 border-white/25 text-zinc-100",
          bar: "bg-zinc-200",
        };
      default:
        return null;
    }
  };

  // Section header accent color per filter
  const getSectionAccentColor = (key: string) => {
    switch (key) {
      case "going":
        return "bg-emerald-500";
      case "waitlist":
        return "bg-amber-500";
      case "passed":
        return "bg-rose-500";
      case "hosted":
        return "bg-zinc-400";
      default:
        return "bg-zinc-600";
    }
  };

  const renderPlanRow = (plan: Plan) => {
    const planCircle = plan.circleId ? circles.find((c) => c.id === plan.circleId) : null;
    const circleName = planCircle?.name || null;

    // When a filter is active the badge always matches the filter; when "all" derive per-plan
    let badge = getStatusBadge(plansFilter);
    if (!badge) {
      const myPp = dbPlanParticipants.find((pp) => pp.plan_id === plan.id && pp.user_id === activeUserId);
      const isGoing = myPp?.status === "going";
      const isWait =
        myPp?.status === "waitlist" ||
        (plan.waitlistUsers || []).some((u) => u.name === userProfile.name) ||
        (plan.interestedUsers || []).some((u) => u.name === userProfile.name);
      const isHosted = plan.creatorId === "u_self" || plan.creatorName === userProfile.name;
      const isPassed =
        (passedByPlanId[plan.id] || []).includes(userProfile.name) || (plan.isHappened && (isGoing || isWait));
      if (isPassed) badge = getStatusBadge("passed");
      else if (isHosted) badge = getStatusBadge("hosted");
      else if (isGoing) badge = getStatusBadge("going");
      else if (isWait) badge = getStatusBadge("waitlist");
    }

    return (
      <motion.div
        key={plan.id}
        layout
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        onClick={() => setSelectedPlan(plan)}
        className="group flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950/70 border border-white/[0.03] hover:border-white/[0.08] hover:bg-zinc-900/40 active:scale-[0.99] transition-all duration-200 select-none text-left cursor-pointer"
      >
        {/* Left side details */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Left glow status indicator dot */}
          <div className="relative shrink-0 flex items-center justify-center">
            <span
              className="absolute w-3 h-3 rounded-full opacity-20 blur-[2px]"
              style={{
                backgroundColor: badge
                  ? badge.bar === "bg-emerald-500"
                    ? "#10b981"
                    : badge.bar === "bg-amber-500"
                    ? "#f59e0b"
                    : badge.bar === "bg-rose-500"
                    ? "#f43f5e"
                    : "#e4e4e7"
                  : "#a1a1aa",
              }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: badge
                  ? badge.bar === "bg-emerald-500"
                    ? "#10b981"
                    : badge.bar === "bg-amber-500"
                    ? "#f59e0b"
                    : badge.bar === "bg-rose-500"
                    ? "#f43f5e"
                    : "#e4e4e7"
                  : "#a1a1aa",
              }}
            />
          </div>

          <div className="min-w-0">
            <h4 className="text-xs font-extrabold text-zinc-100 uppercase tracking-wide truncate">
              {plan.title}
            </h4>
            <div className="text-[9px] font-mono text-zinc-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>⏰ {plan.time}</span>
              <span>•</span>
              <span className="truncate max-w-[130px]">📍 {plan.location}</span>
              {circleName && (
                <>
                  <span>•</span>
                  <span className="text-zinc-650 font-sans font-semibold">👥 {circleName.toUpperCase()}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right side status / management controls */}
        <div className="flex items-center gap-2 shrink-0 pl-2">
          {plan.cost > 0 && (
            <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-900 border border-white/[0.04] px-2 py-0.5 rounded-md">
              ₹{plan.cost}
            </span>
          )}
          {badge && (
            <span
              className={`text-[8px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${badge.cls
                .replace("bg-emerald-500/20", "bg-emerald-500/10")
                .replace("bg-amber-500/20", "bg-amber-500/10")
                .replace("bg-rose-500/15", "bg-rose-500/8")
                .replace("bg-white/12", "bg-white/5")}`}
            >
              {(() => {
                const label = badge.label.replace(" ✓", "");
                if (label === "Going") {
                  const myPp = dbPlanParticipants.find(pp => pp.plan_id === plan.id && pp.user_id === activeUserId);
                  if (myPp && myPp.payment_status === "unpaid" && plan.cost > 0) {
                    return `Pay ₹${plan.cost}`;
                  }
                }
                return label;
              })()}
            </span>
          )}
          <ChevronRight className="w-3.5 h-3.5 text-zinc-650 group-hover:text-zinc-400 transition-colors" />
        </div>
      </motion.div>
    );
  };

  return (
    <div id="plans_tab_pane" className="space-y-4 pb-4 text-left pt-2">
      <div className="pb-1.5 pt-1.5 text-left">
        <h2 className="text-xl font-display font-black text-zinc-100 tracking-tight">Plans</h2>
      </div>

      {/* Search Bar - Main top element pushed upward with no large page header */}
      <div className="px-1 relative">
        <span className="absolute left-4.5 top-1/2 -translate-y-1/2 text-zinc-550 text-xs">🔍</span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search your plans"
          className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-zinc-900/40 border border-white/[0.04] text-xs font-sans text-white placeholder-zinc-550 focus:outline-none focus:border-white/[0.12] transition-colors shadow-inner"
        />
      </div>

      {/* Color-synced filter trigger button */}
      <div className="px-1 pt-0.5">
        <div
          className={`flex items-center rounded-2xl border p-1 gap-1 transition-all duration-300 ${getFilterTriggerClass(
            plansFilter
          )}`}
        >
          {SEGMENTS.map((seg) => {
            const active = plansFilter === seg.key;
            // Dynamic count calculation matching segment filters perfectly
            const count = involvedPlans.filter((p) => {
              const planCircle = p.circleId ? circles.find((c) => c.id === p.circleId) : null;
              const circleName = planCircle?.name || "";
              const matchesSearch =
                p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                circleName.toLowerCase().includes(searchQuery.toLowerCase());
              if (!matchesSearch) return false;

              const myParticipant = dbPlanParticipants.find(
                (pp) => pp.plan_id === p.id && pp.user_id === userUuid
              );
              const isGoing = myParticipant?.status === "going";
              const isWaitlisted =
                myParticipant?.status === "waitlist" ||
                (p.waitlistUsers || []).some((u) => u.name === userProfile.name) ||
                (p.interestedUsers || []).some((u) => u.name === userProfile.name);
              const isHosted = p.creatorId === "u_self" || p.creatorName === userProfile.name;
              const autoPassed = (passedByPlanId[p.id] || []).includes(userProfile.name);

              if (seg.key === "going") return isGoing && !p.isHappened && !autoPassed;
              if (seg.key === "waitlist") return isWaitlisted && !p.isHappened;
              if (seg.key === "passed") {
                const historicallyJoined = p.isHappened && (isGoing || isWaitlisted);
                return autoPassed || historicallyJoined;
              }
              if (seg.key === "hosted") return isHosted;
              return false;
            }).length;

            return (
              <button
                key={seg.key}
                onClick={() => setPlansFilter((prev) => (prev === seg.key ? "all" : seg.key))}
                className={getFilterBtnClass(seg.key, active)}
              >
                {seg.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Chronological Plan sections — Today / Tomorrow / This Week */}
      <div className="space-y-5 pt-1">
        {filteredPlans.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-2 text-center">
            <span className="text-3xl opacity-30">
              {plansFilter === "hosted"
                ? "🎯"
                : plansFilter === "waitlist"
                ? "⏳"
                : plansFilter === "passed"
                ? "📜"
                : "✅"}
            </span>
            <p className="text-[11px] font-sans text-zinc-600 leading-relaxed max-w-[200px]">
              {emptyMessages[plansFilter]}
            </p>
          </div>
        ) : (
          <>
            {/* TODAY SECTION */}
            {todayPlans.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 px-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${getSectionAccentColor(plansFilter)}`} />
                  <h4 className="text-[10px] font-mono text-zinc-400 uppercase tracking-[0.22em] font-bold">
                    Today
                  </h4>
                  <div className="flex-1 h-[1px] bg-white/[0.04]" />
                  <span className="text-[9px] font-mono text-zinc-600">
                    {todayPlans.length} plan{todayPlans.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-2">
                  {todayPlans.map((plan) => renderPlanRow(plan))}
                </div>
              </div>
            )}

            {/* TOMORROW SECTION */}
            {tomorrowPlans.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 px-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${getSectionAccentColor(plansFilter)}`} />
                  <h4 className="text-[10px] font-mono text-zinc-400 uppercase tracking-[0.22em] font-bold">
                    Tomorrow
                  </h4>
                  <div className="flex-1 h-[1px] bg-white/[0.04]" />
                  <span className="text-[9px] font-mono text-zinc-600">
                    {tomorrowPlans.length} plan{tomorrowPlans.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-2">
                  {tomorrowPlans.map((plan) => renderPlanRow(plan))}
                </div>
              </div>
            )}

            {/* THIS WEEK SECTION */}
            {thisWeekPlans.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 px-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${getSectionAccentColor(plansFilter)}`} />
                  <h4 className="text-[10px] font-mono text-zinc-400 uppercase tracking-[0.22em] font-bold">
                    This Week
                  </h4>
                  <div className="flex-1 h-[1px] bg-white/[0.04]" />
                  <span className="text-[9px] font-mono text-zinc-600">
                    {thisWeekPlans.length} plan{thisWeekPlans.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-2">
                  {thisWeekPlans.map((plan) => renderPlanRow(plan))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

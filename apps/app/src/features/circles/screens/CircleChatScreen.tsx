import React, { useState, useEffect } from 'react';
import { ArrowLeft, Settings, Users, Calendar, MapPin, ChevronRight, Plus } from "lucide-react";
import { mapPlansToLegacyPlans } from "../../../lib/mappers";

export const CircleChatScreen = (props: any) => {
  const {
    circle,
    activeUserId,
    onBack,
    onOpenSettings,
    setSelectedPlan,
    setPaymentConfirmationPlan,
    handleToggleJoin,
    triggerToast,
    // Create plan navigation
    setNewPlanCircleId,
    setNewPlanTitle,
    setSelectedPreset,
    setAudienceType,
    setSelectedCircleIds,
    setActiveTab,
    setCreateFlowStep,
  } = props;

  const [circlePlans, setCirclePlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCirclePlans() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/db/fetch-all");
        if (res.ok) {
          const json = await res.json();
          if (json.configured && !json.tables_missing) {
            const allPlans = json.data?.plans || [];
            const allParticipants = json.data?.plan_participants || [];
            const allUsers = json.data?.users || [];
            const allCircles = json.data?.circles || [];

            const mapped = mapPlansToLegacyPlans(allPlans, allParticipants, allUsers, activeUserId, allCircles);
            const circleUuid = circle.dbUuid || circle.id;
            const filtered = mapped.filter(
              (p: any) => p.circleId === circleUuid || p.groupId === circleUuid
            );
            setCirclePlans(filtered);
          }
        }
      } catch (err) {
        console.error("[CircleChatScreen] Failed to load plans:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadCirclePlans();
  }, [circle.id, circle.dbUuid, activeUserId]);

  // Chronological (oldest first) for a chat timeline
  const sortedPlans = [...circlePlans].sort((a: any, b: any) => {
    return (new Date(a.date).getTime() || 0) - (new Date(b.date).getTime() || 0);
  });

  const handleHostPlan = () => {
    setNewPlanCircleId?.(circle.id);
    setNewPlanTitle?.(`Meetup with ${circle.name}`);
    setSelectedPreset?.("custom");
    setAudienceType?.("circle");
    setSelectedCircleIds?.([circle.id]);
    setActiveTab?.("create");
    setCreateFlowStep?.("DETAILS");
    triggerToast?.(`Creating plan for ${circle.name} ⚡`);
  };

  const timelineRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (timelineRef.current) {
      console.log("[CircleChatScreen Logs]");
      console.log("- Number of plans rendered:", sortedPlans.length);
      console.log("- Timeline container clientHeight (visible):", timelineRef.current.clientHeight);
      console.log("- Timeline scrollHeight (total content height):", timelineRef.current.scrollHeight);
    }
  }, [sortedPlans]);

  return (
    /**
     * Outer shell: h-full, flex column.
     * Three rows: [header | scrollable timeline | fixed footer]
     * No nested scroll containers.
     */
    <div
      id="circle_plans_container"
      className="flex flex-col animate-fade-in select-none h-full"
    >
      {/* ── 1. COMPACT HEADER ────────────────────────────────────────── */}
      <div
        id="circle_plans_header"
        className="shrink-0 flex items-center justify-between bg-zinc-950/80 border border-zinc-900 rounded-2xl p-2 backdrop-blur-md shadow-md"
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full transition-all cursor-pointer"
            aria-label="Back to circles list"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div
            onClick={onOpenSettings}
            className="flex items-center gap-2 cursor-pointer group min-w-0"
            title="Open Group Settings"
          >
            <img
              src={
                circle.groupImage ||
                circle.avatars?.[0] ||
                "https://images.unsplash.com/photo-1543351611-58f69d7c1781?auto=format&fit=crop&q=80&w=200"
              }
              className="w-8 h-8 rounded-lg object-cover border border-zinc-800 group-hover:border-[#ff8b66] transition-colors"
              alt=""
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0">
              <h3 className="text-xs font-display font-black text-white tracking-tight truncate group-hover:text-[#ff8b66] transition-colors uppercase">
                {circle.name}
              </h3>
              <span className="text-[9px] text-zinc-500 font-mono flex items-center gap-1">
                <Users className="w-2.5 h-2.5 text-[#ff8b66]" />
                {circle.membersCount || circle.membersList?.length || 0} members • Settings
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenSettings}
          className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900/60 border border-zinc-850 hover:border-zinc-750 rounded-lg transition-all cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── 2. SINGLE SCROLLABLE TIMELINE ────────────────────────────── */}
      <div
        id="circle_plans_timeline"
        ref={timelineRef}
        className="flex-1 overflow-y-auto no-scrollbar mt-2 mb-2 rounded-2xl border border-zinc-900/30 bg-zinc-950/20 p-2"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
              Loading plans...
            </span>
          </div>
        ) : sortedPlans.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-4 text-center space-y-1.5">
            <div className="w-8 h-8 rounded-full bg-zinc-900/50 border border-zinc-850 flex items-center justify-center text-zinc-500">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <p className="text-[11px] text-zinc-400 font-semibold">No plans posted yet</p>
            <p className="text-[9.5px] text-zinc-500 max-w-[200px]">
              Tap "Host a Plan" below to create the first plan for this circle.
            </p>
          </div>
        ) : (
          /* Small bottom padding so the last card clears the composer */
          <div className="space-y-3 pb-2">
            {sortedPlans.map((plan: any) => {
              const isCurrentUser = plan.creatorId === "u_self";
              const isCompleted = plan.isHappened;
              const isAlreadyJoined = plan.joinedUsers?.some(
                (u: any) => u.userId === activeUserId
              );

              return (
                <div
                  key={plan.id}
                  className={`flex flex-col max-w-[85%] ${
                    isCurrentUser ? "ml-auto items-end" : "mr-auto items-start"
                  }`}
                >
                  {/* Creator label */}
                  <span className="text-[9px] font-bold text-zinc-500 mb-0.5 px-1">
                    {plan.creatorName || (isCurrentUser ? "You" : "Member")}
                  </span>

                  {/* Bubble card */}
                  <div
                    onClick={() => setSelectedPlan(plan)}
                    className={`group w-full border p-3 flex flex-col cursor-pointer transition-all duration-200 ${
                      isCurrentUser
                        ? "rounded-2xl rounded-tr-none bg-zinc-900 border-[#ff8b66]/20 hover:border-[#ff8b66]/40"
                        : "rounded-2xl rounded-tl-none bg-zinc-900 border-zinc-850 hover:border-zinc-750"
                    }`}
                  >
                    {/* Title + cost */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h4
                          className={`text-[11px] font-sans font-black uppercase tracking-wide truncate ${
                            isCompleted ? "text-zinc-550" : "text-white"
                          }`}
                        >
                          {plan.title}
                        </h4>
                        <div className="text-[9px] font-mono mt-1 space-y-0.5 text-zinc-500">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-2.5 h-2.5 text-[#ff8b66]" />
                            <span className={isCompleted ? "" : "text-zinc-300"}>
                              {plan.date} • {plan.time}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-2.5 h-2.5 text-zinc-650" />
                            <span className="truncate">{plan.location}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`text-[10px] font-black font-mono block ${
                            isCompleted ? "text-zinc-550" : "text-zinc-200"
                          }`}
                        >
                          ₹{plan.cost}
                        </span>
                        <span className="text-[7px] font-mono text-zinc-600 uppercase tracking-wider">
                          Split/Head
                        </span>
                      </div>
                    </div>

                    {/* Footer: avatars + action */}
                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-zinc-950/50">
                      <div className="flex items-center gap-1">
                        <div className="flex -space-x-1">
                          {plan.joinedUsers
                            ?.filter(
                              (u: any) =>
                                u.joinState === "going" || u.joinState === "host"
                            )
                            .slice(0, 3)
                            .map((u: any, ui: number) => (
                              <img
                                key={ui}
                                src={u.avatar}
                                className="w-4 h-4 rounded-full object-cover border border-zinc-950"
                                alt=""
                                referrerPolicy="no-referrer"
                              />
                            ))}
                        </div>
                        <span className="text-[8px] font-mono text-zinc-500">
                          {plan.confirmedCount || 0} joined
                          {plan.maxSpots
                            ? ` (${plan.maxSpots - (plan.confirmedCount || 0)} left)`
                            : ""}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!isCompleted ? (
                          !isAlreadyJoined ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (plan.cost > 0) {
                                  setPaymentConfirmationPlan(plan);
                                } else {
                                  handleToggleJoin(plan);
                                  triggerToast("Joined active coordination! ⚡");
                                }
                              }}
                              className="px-2 py-0.5 bg-[#ff8b66] hover:bg-[#ff9a7c] text-black text-[8px] font-black uppercase tracking-wider rounded transition-all cursor-pointer shadow"
                            >
                              Join
                            </button>
                          ) : (
                            <span className="text-[8px] font-mono font-bold text-emerald-400 bg-emerald-950/20 px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-0.5">
                              Joined
                            </span>
                          )
                        ) : (
                          <span className="text-[8px] font-mono font-bold text-zinc-500 bg-zinc-950 border border-zinc-900 px-1.5 py-0.5 rounded uppercase tracking-wider">
                            Past
                          </span>
                        )}
                        <ChevronRight className="w-3 h-3 text-zinc-650 group-hover:text-zinc-400 transition-colors" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 3. FIXED FOOTER ─────────────────────────────────────────── */}
      <div
        id="circle_plans_footer"
        className="shrink-0 pt-1 bg-[#0C0C0E]"
      >
        <button
          id="circle_host_plan_button"
          type="button"
          onClick={handleHostPlan}
          className="w-full h-11 bg-[#ff8b66] hover:bg-[#ff9a7c] text-black font-sans font-black text-xs tracking-widest uppercase rounded-2xl flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] shadow-[0_4px_20px_rgba(255,139,102,0.15)] cursor-pointer"
          aria-label="Host a Plan"
        >
          <Plus className="w-4.5 h-4.5 stroke-[3]" />
          <span>HOST PLAN</span>
        </button>
      </div>
    </div>
  );
};

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { SportsIcon, MoviesIcon, FoodIcon } from "../../../shared/components/Icons";
import { UserProfile, Plan, NotificationItem } from "../../../core/types";
import { getDeadlineText } from "../../../lib/mappers";
import { usePlanVisibility } from "../hooks/usePlanVisibility";
import { useHoldToAccept } from "../hooks/useHoldToAccept";
import { HoldToAcceptOverlay } from "./HoldToAcceptOverlay";
import { usePlansStore } from "../../plans/state/PlansContext";

export interface PlanCardProps {
  plan: Plan;
  userProfile: UserProfile;
  interestedPlanIds: string[];
  setSelectedPlan: (plan: Plan | null) => void;
  setPaymentConfirmationPlan: (plan: Plan | null) => void;
  walletBalance: number;
  handleToggleJoin: (plan: Plan) => void;
  setShowPaymentSuccess: (plan: Plan | null) => void;
  setShowWaitlistSuccess?: (plan: Plan | null) => void;
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  triggerToast: (msg: string) => void;
  activeCardId: string | null;
  onSelectCard: (planId: string) => void;
  handleSnoozePlan: (planId: string) => void;
  waitlistPlan?: (planId: string, userProfile: any) => void;
}

export const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  userProfile,
  interestedPlanIds,
  setSelectedPlan,
  setPaymentConfirmationPlan,
  walletBalance,
  handleToggleJoin,
  setShowPaymentSuccess,
  setShowWaitlistSuccess,
  setNotifications,
  triggerToast,
  activeCardId,
  onSelectCard,
  handleSnoozePlan,
  waitlistPlan,
}) => {
  const {
    isJoined,
    isWaitlisted,
    isDeadlinePassed,
    formattedDateAndTime,
    getParticipantStatusList,
    displayActivityName,
    categoryTag,
    glowStyle,
    coverToUse,
    maxSpots,
    currentCount,
    isFull,
    barGradient,
    categoryColorDot,
    groupName,
    groupColor,
  } = usePlanVisibility(plan, userProfile);

  const cardRef = React.useRef<HTMLDivElement>(null);
  const { markPlanSeen } = usePlansStore();

  React.useEffect(() => {
    if (!cardRef.current || !userProfile.user_id) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const rawId = plan.dbUuid || plan.id;
          const cleanId = rawId.replace("-loop-prev-dup", "").replace("-loop-next-dup", "");
          const myParticipant = plan.members.find(
            m => m.userId === userProfile.user_id || m.userUuid === userProfile.dbUuid
          );
          if (myParticipant && myParticipant.joinState === "delivered") {
            console.log(`[Home Feed Visibility Trigger] Transitioning delivered -> seen for plan: ${plan.title}`);
            const resolvedUserUuid = userProfile.dbUuid || userProfile.user_id;
            markPlanSeen(cleanId, resolvedUserUuid).catch(console.error);
          }
        }
      },
      { threshold: 0.6 }
    );

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [plan.id, userProfile.user_id, plan.members, markPlanSeen]);

  const {
    holdProgress,
    isHolding,
    isSuccess,
    successMode,
    isExpanded,
    setIsExpanded,
    dragY,
    startHolding,
    stopHolding,
    handlePointerMove,
    cancelHolding,
  } = useHoldToAccept({
    plan,
    userProfile,
    isDeadlinePassed,
    isJoined,
    isWaitlisted,
    isFull,
    handleToggleJoin,
    setShowPaymentSuccess,
    setShowWaitlistSuccess,
    setNotifications,
    triggerToast,
    activeCardId,
    onSelectCard,
    handleSnoozePlan,
    waitlistPlan,
  });

  const categoryStr = plan.category as string;
  let iconToRender = <SportsIcon />;
  if (categoryStr === "sunset" || categoryStr === "brunch" || categoryStr === "restaurants" || categoryStr === "cafe") {
    iconToRender = <FoodIcon />;
  } else if (categoryStr === "movies") {
    iconToRender = <MoviesIcon />;
  } else if (categoryStr === "sports") {
    iconToRender = <SportsIcon />;
  }

  const costOpacity = Math.max(0, Math.min(1, (holdProgress - 15) / 25));
  const costY = 16 * (1 - costOpacity);
  const timeOpacity = Math.max(0, Math.min(1, (holdProgress - 40) / 25));
  const timeY = 16 * (1 - timeOpacity);
  const locOpacity = Math.max(0, Math.min(1, (holdProgress - 65) / 25));
  const locY = 16 * (1 - locOpacity);

  return (
    <div
      ref={cardRef}
      className="w-full h-full snap-start shrink-0 relative flex flex-col justify-end p-6 select-none overflow-hidden cursor-pointer touch-none"
      style={{
        scrollSnapAlign: "start",
        scrollSnapStop: "always",
        height: "100%",
        boxShadow: isHolding
          ? `0 0 ${15 + (holdProgress / 100) * 35}px rgba(255, 139, 102, ${0.15 + (holdProgress / 100) * 0.45})`
          : "none",
        transform: isHolding ? `scale(${1 - (holdProgress / 100) * 0.035})` : "scale(1)",
        transition: isHolding ? "none" : "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease",
      }}
      onPointerDown={startHolding}
      onPointerMove={handlePointerMove}
      onPointerUp={stopHolding}
      onPointerLeave={cancelHolding}
    >
      <img
        src={coverToUse}
        alt={plan.title}
        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
        referrerPolicy="no-referrer"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />

      <div className="absolute top-10 left-6 right-6 flex items-center justify-between z-10 pointer-events-none">
        <span className={`bg-[#0c0c0e]/90 backdrop-blur-md text-[10px] font-sans uppercase tracking-[0.14em] font-extrabold px-4 py-2 rounded-full border border-white/10 shadow-lg ${groupColor}`}>
          {groupName.toUpperCase()}
        </span>

        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${glowStyle} border flex items-center justify-center shadow-lg`}>
          {iconToRender}
        </div>
      </div>

      <div className="z-10 space-y-4 w-full pointer-events-none">
        <div className="space-y-2">
          <h2
            style={{
              fontSize: displayActivityName.length <= 6
                ? "clamp(2.25rem, 10vw, 3rem)"
                : displayActivityName.length <= 10
                ? "clamp(1.95rem, 8.5vw, 2.6rem)"
                : displayActivityName.length <= 14
                ? "clamp(1.65rem, 7.5vw, 2.2rem)"
                : displayActivityName.length <= 18
                ? "clamp(1.45rem, 6.5vw, 1.9rem)"
                : "clamp(1.25rem, 5.5vw, 1.6rem)",
              letterSpacing: displayActivityName.length <= 6
                ? "-0.03em"
                : displayActivityName.length <= 10
                ? "-0.025em"
                : displayActivityName.length <= 14
                ? "-0.025em"
                : "-0.01em",
              lineHeight: displayActivityName.length <= 14 ? "0.95" : "1.0",
            }}
            className="font-sans font-extrabold text-white drop-shadow-md max-w-full pr-1 tracking-tight leading-tight"
          >
            {displayActivityName}
          </h2>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2 text-stone-100 drop-shadow-sm font-semibold text-[11px] uppercase tracking-wider font-mono">
              <span className="text-amber-400">📅</span>
              <span>{formattedDateAndTime}</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-200 drop-shadow-sm font-sans text-[11px] tracking-wide">
              <span className="text-brand-peach">📍</span>
              <span className="truncate max-w-[85%]">{plan.location}</span>
            </div>

            {plan.response_deadline_at && (
              <div className="flex items-center gap-2 text-amber-400 drop-shadow-sm font-semibold text-[11px] font-mono">
                <span>⏳</span>
                <span>{getDeadlineText(plan.response_deadline_at)}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-emerald-400 drop-shadow-md font-sans text-xs font-black uppercase tracking-wider pt-0.5">
              <span className="text-xs">💵</span>
              <span>{plan.cost > 0 ? `₹${plan.cost}` : "🍿 FREE"}</span>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 w-full" />

        <div
          className="space-y-3 w-full text-left pointer-events-auto cursor-pointer group/momentum bg-white/[0.015] hover:bg-white/[0.045] active:bg-white/[0.065] px-4 py-3.5 rounded-2xl border border-white/[0.035] hover:border-white/[0.065] transition-all duration-300 shadow-md"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          <div className="flex justify-between items-center text-[10.5px] font-sans font-medium select-none">
            <span className="flex items-center gap-1.5 tracking-wide">
              <span className={`w-1.5 h-1.5 rounded-full ${isFull ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.85)]" : "bg-[#ff6b4a] shadow-[0_0_8px_rgba(255,107,74,0.85)]"} animate-pulse`} />
              <span className="text-zinc-300 group-hover/momentum:text-white transition-colors flex items-center gap-1">
                Host: {plan.creatorName || "Raghavan"}
                <span className="w-2.5 h-2.5 flex items-center justify-center shrink-0">
                  {isExpanded ? (
                    <svg viewBox="0 0 24 24" className="w-[10px] h-[10px] text-zinc-400" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-[10px] h-[10px] text-zinc-400" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  )}
                </span>
              </span>
            </span>
            {(() => {
              const isHost = plan.hostId === "u_self" || plan.creatorId === "u_self" || plan.creatorName === userProfile.name;
              return isHost ? (
                <span className="text-zinc-400 select-none">
                  Joined: <strong className="text-white font-extrabold">{currentCount}</strong> | Waitlist: <strong className="text-amber-400 font-extrabold">{plan.waitlistUsers ? plan.waitlistUsers.length : 0}</strong>
                </span>
              ) : isFull ? (
                <span className="text-amber-400 font-extrabold tracking-wide uppercase text-[10px] select-none">
                  Waitlist Open
                </span>
              ) : (
                <span className="text-zinc-400 select-none">
                  <strong className="text-white font-extrabold">{currentCount} / {maxSpots}</strong> joined
                </span>
              );
            })()}
          </div>

          <div className="h-[3px] w-full bg-black/80 rounded-full overflow-hidden relative border border-white/[0.02]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#ff593c] via-[#ff7c55] to-[#fdb933] transition-all duration-700 ease-out"
              style={{
                width: `${Math.min(100, (currentCount / maxSpots) * 100)}%`,
                boxShadow: "0 0 6px rgba(255, 91, 63, 0.25)"
              }}
            />
          </div>

          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                animate={{ height: "auto", opacity: 1, marginTop: 10 }}
                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden border-t border-white/[0.05] pt-2"
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
              >
                <div className="space-y-2 max-h-[160px] overflow-y-auto no-scrollbar pt-1 pr-0.5 mt-0.5 pointer-events-auto">
                  {(() => {
                    const { going, waitlist, delivered, seen, skipped } = getParticipantStatusList();
                    return (
                      <div className="space-y-1.5 pt-0.5">
                        {going.map((user, idx) => (
                          <div key={`going-${idx}`} className="flex items-center justify-between py-1 border-b border-white/[0.01]">
                            <div className="flex items-center gap-2">
                              <img src={user.avatar} className="w-5.5 h-5.5 rounded-full object-cover ring-1 ring-emerald-500/25 shrink-0" referrerPolicy="no-referrer" />
                              <span className="text-[10.5px] font-bold text-zinc-100">
                                {user.name}
                                {user.isHost && <span className="text-[9px] text-zinc-500 font-normal ml-1">(Host)</span>}
                              </span>
                            </div>
                            <span className="text-[7.5px] font-mono text-emerald-400 font-bold uppercase tracking-wider bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">{user.status}</span>
                          </div>
                        ))}

                        {waitlist.map((user, idx) => (
                          <div key={`waitlist-${idx}`} className="flex items-center justify-between py-1 border-b border-white/[0.01]">
                            <div className="flex items-center gap-2">
                              <img src={user.avatar} className="w-5.5 h-5.5 rounded-full object-cover ring-1 ring-amber-500/25 shrink-0" referrerPolicy="no-referrer" />
                              <span className="text-[10.5px] font-bold text-zinc-100">{user.name}</span>
                            </div>
                            <span className="text-[7.5px] font-mono text-amber-400 font-bold uppercase tracking-wider bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">{user.status}</span>
                          </div>
                        ))}

                        {delivered.map((user, idx) => (
                          <div key={`delivered-${idx}`} className="flex items-center justify-between py-1 border-b border-white/[0.01] opacity-75">
                            <div className="flex items-center gap-2">
                              <img src={user.avatar} className="w-5 h-5 rounded-full object-cover ring-1 ring-zinc-500/20 shrink-0" referrerPolicy="no-referrer" />
                              <span className="text-[10px] text-zinc-400">{user.name}</span>
                            </div>
                            <span className="text-[7.5px] font-mono text-zinc-400 font-bold uppercase tracking-wider bg-zinc-800/40 px-1.5 py-0.5 rounded border border-zinc-700/30">{user.status}</span>
                          </div>
                        ))}

                        {seen.map((user, idx) => (
                          <div key={`seen-${idx}`} className="flex items-center justify-between py-1 border-b border-white/[0.01]">
                            <div className="flex items-center gap-2">
                              <img src={user.avatar} className="w-5 h-5 rounded-full object-cover ring-1 ring-white/10 shrink-0" referrerPolicy="no-referrer" />
                              <span className="text-[10px] text-zinc-200 font-medium">{user.name}</span>
                            </div>
                            <span className="text-[7.5px] font-mono text-zinc-100 font-extrabold uppercase tracking-wider bg-white/10 px-1.5 py-0.5 rounded border border-white/15">{user.status}</span>
                          </div>
                        ))}

                        {skipped.map((user, idx) => (
                          <div key={`skipped-${idx}`} className="flex items-center justify-between py-1 opacity-60">
                            <div className="flex items-center gap-2">
                              <img src={user.avatar} className="w-5 h-5 rounded-full object-cover ring-1 ring-rose-500/20 shrink-0" referrerPolicy="no-referrer" />
                              <span className="text-[10px] text-zinc-350">{user.name}</span>
                            </div>
                            <span className="text-[7.5px] font-mono text-rose-400 font-bold uppercase tracking-wider bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">{user.status}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        <HoldToAcceptOverlay
          plan={plan}
          holdProgress={holdProgress}
          isHolding={isHolding}
          isFull={isFull}
          formattedDateAndTime={formattedDateAndTime}
        />

        {isSuccess && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="absolute inset-0 bg-[#0e0e11]/95 backdrop-blur-md z-30 flex flex-col items-center justify-center pointer-events-none"
          >
            {successMode === "waitlist" ? (
              <>
                <motion.div
                  initial={{ scale: 0.5 }}
                  animate={{ scale: [0.5, 1.15, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 0.4 }}
                  className="w-16 h-16 rounded-full bg-amber-500/10 border-2 border-amber-500 flex items-center justify-center text-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.25)]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
                <span className="text-base font-sans font-black tracking-[0.2em] text-amber-400 mt-6 uppercase">WAITLISTED</span>
                <span className="text-xs font-sans text-zinc-400 mt-2">Added to Waitlist</span>
              </>
            ) : (
              <>
                <motion.div
                  initial={{ scale: 0.5 }}
                  animate={{ scale: [0.5, 1.15, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 0.4 }}
                  className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.25)]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
                <span className="text-base font-sans font-black tracking-[0.2em] text-emerald-400 mt-6 uppercase">JOINED</span>
                <span className="text-xs font-sans text-zinc-400 mt-2">Opening wallet split payment popup...</span>
              </>
            )}
          </motion.div>
        )}

        {isDeadlinePassed && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center pointer-events-none">
            <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 shadow-xl">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-sm font-sans font-black tracking-[0.2em] text-zinc-400 mt-4 uppercase">RESPONSES CLOSED</span>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

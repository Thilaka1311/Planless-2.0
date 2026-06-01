import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SportsIcon, MoviesIcon, FoodIcon } from "../../../shared/components/Icons";
import { UserProfile, Plan, NotificationItem } from "../../../core/types";
import { getInitialsAvatar } from "../../../lib/mappers";

interface PlanReelCardProps {
  key?: string;
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

const PlanReelCard = ({
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
  waitlistPlan
}: PlanReelCardProps) => {
  const HOLD_DURATION = 1400; // ms
  const [holdProgress, setHoldProgress] = useState(0); // 0 to 100
  const [isHolding, setIsHolding] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMode, setSuccessMode] = useState<"join" | "waitlist">("join");
  const [isExpanded, setIsExpanded] = useState(false);

  const startYRef = useRef<number>(0);
  const [dragY, setDragY] = useState<number>(0);
  const isDraggingRef = useRef<boolean>(false);

  const getDynamicTitleStyle = (text: string) => {
    const len = text.length;
    let fontSize = "clamp(2rem, 9.5vw, 3rem)";
    let letterSpacing = "-0.02em";
    let lineHeight = "0.95";

    if (len <= 6) {
      fontSize = "clamp(2.25rem, 10vw, 3rem)";
      letterSpacing = "-0.03em";
      lineHeight = "0.95";
    } else if (len <= 10) {
      fontSize = "clamp(1.95rem, 8.5vw, 2.6rem)";
      letterSpacing = "-0.025em";
      lineHeight = "0.95";
    } else if (len <= 14) {
      fontSize = "clamp(1.65rem, 7.5vw, 2.2rem)";
      letterSpacing = "-0.02em";
      lineHeight = "0.95";
    } else if (len <= 18) {
      fontSize = "clamp(1.45rem, 6.5vw, 1.9rem)";
      letterSpacing = "-0.015em";
      lineHeight = "1.0";
    } else {
      fontSize = "clamp(1.25rem, 5.5vw, 1.6rem)";
      letterSpacing = "-0.01em";
      lineHeight = "1.05";
    }

    return { fontSize, letterSpacing, lineHeight };
  };

  const holdStartTimeRef = useRef<number>(0);
  const progressRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const isHoldTriggeredRef = useRef<boolean>(false);

  const holdDelayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerDownTimeRef = useRef<number>(0);
  const hasHoldStartedRef = useRef<boolean>(false);

  const isJoined = plan.joinedUsers.some(u => {
    if (u.joinState === "waitlist") return false;
    const cleanU = u.name.toLowerCase().replace(/[^a-z]/g, "");
    const cleanProfile = userProfile.name.toLowerCase().replace(/[^a-z]/g, "");
    return cleanU.includes(cleanProfile) || cleanProfile.includes(cleanU);
  });

  const isWaitlisted = plan.joinedUsers.some(u => {
    if (u.joinState !== "waitlist") return false;
    const cleanU = u.name.toLowerCase().replace(/[^a-z]/g, "");
    const cleanProfile = userProfile.name.toLowerCase().replace(/[^a-z]/g, "");
    return cleanU.includes(cleanProfile) || cleanProfile.includes(cleanU);
  });

  const getFormattedDateAndTime = () => {
    const rawDate = (plan.date || "TODAY").trim().toUpperCase();
    const rawTime = (plan.time || "8:30 PM").trim().toUpperCase();
    let cleanTime = rawTime.replace(/⏰/g, "").replace(/TODAY\s*•\s*/g, "").trim();

    if (rawDate === "TODAY") return `TUE, 26 MAY • ${cleanTime}`;
    if (rawDate === "TOMORROW") return `WED, 27 MAY • ${cleanTime}`;
    if (rawDate === "FRI" || rawDate === "FRIDAY") return `FRI, 29 MAY • ${cleanTime}`;
    if (rawDate === "SAT" || rawDate === "SATURDAY") return `SAT, 30 MAY • ${cleanTime}`;
    if (rawDate === "SUN" || rawDate === "SUNDAY") return `SUN, 31 MAY • ${cleanTime}`;
    if (rawDate === "THU" || rawDate === "THURSDAY") return `THU, 28 MAY • ${cleanTime}`;
    if (rawDate.includes(",")) return `${rawDate} • ${cleanTime}`;

    return `${rawDate} • ${cleanTime}`;
  };

  const getParticipantStatusList = () => {
    // Source of truth: plan.members is mapped from DB plan_participants rows
    const hostEntry = plan.members.find(m => m.joinState === "host") || null;
    const hostName = plan.creatorName || "Host";
    const hostAvatar = plan.creatorAvatar || getInitialsAvatar(hostName);

    const going: { name: string; avatar: string; status: string; isHost: boolean }[] = [];
    const waitlist: { name: string; avatar: string; status: string }[] = [];
    const delivered: { name: string; avatar: string; status: string }[] = [];
    const seen: { name: string; avatar: string; status: string }[] = [];
    const skipped: { name: string; avatar: string; status: string }[] = [];

    // Always put host first in going
    going.push({ name: hostName, avatar: hostAvatar, status: "Going", isHost: true });

    for (const m of plan.members) {
      // Skip the host record itself (already added)
      if (m.joinState === "host") continue;

      const entry = {
        name: m.name,
        avatar: m.avatar || getInitialsAvatar(m.name),
      };

      if (m.joinState === "going") {
        going.push({ ...entry, status: "Going", isHost: false });
      } else if (m.joinState === "waitlist") {
        waitlist.push({ ...entry, status: "Waitlist" });
      } else if (m.joinState === "delivered") {
        delivered.push({ ...entry, status: "Delivered" });
      } else if (m.joinState === "passed" || m.joinState === "skipped" as any) {
        skipped.push({ ...entry, status: "Skipped" });
      } else {
        // Any other status (e.g. unknown): treat as delivered/pending
        delivered.push({ ...entry, status: "Delivered" });
      }
    }

    return { going, waitlist, delivered, seen, skipped };
  };

  let displayActivityName = plan.title;
  if (plan.title.toLowerCase().includes("football") || plan.title.toLowerCase().includes("turf") || plan.title.toLowerCase().includes("matchday")) {
    displayActivityName = "Football Tonight";
  } else if (plan.title.toLowerCase().includes("drive") || plan.title.toLowerCase().includes("sunset")) {
    displayActivityName = "Sunset Drive";
  } else if (plan.title.toLowerCase().includes("waffles") || plan.title.toLowerCase().includes("cafe")) {
    displayActivityName = "Waffle Time";
  } else if (plan.title.toLowerCase().includes("movie") || plan.title.toLowerCase().includes("screening")) {
    displayActivityName = "Luxe IMAX";
  } else {
    displayActivityName = plan.title.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
  }

  const categoryStr = plan.category as string;
  let categoryTag = "COFFEE NIGHT";
  if (categoryStr === "sports" || plan.id === "P001") {
    categoryTag = "MATCHDAY";
  } else if (categoryStr === "sunset") {
    categoryTag = "SPONTY RUN";
  } else if (categoryStr === "movies") {
    categoryTag = "BLOCKBUSTER";
  } else if (categoryStr === "brunch" || categoryStr === "restaurants") {
    categoryTag = "CAFE VENTURES";
  }

  let iconToRender = <SportsIcon />;
  let glowStyle = "from-emerald-500/15 to-emerald-600/5 text-emerald-300 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.25)]";
  if (categoryStr === "sunset" || categoryStr === "brunch" || categoryStr === "restaurants" || categoryStr === "cafe") {
    iconToRender = <FoodIcon />;
    glowStyle = "from-rose-500/15 to-pink-500/5 text-rose-300 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.25)]";
  } else if (categoryStr === "movies") {
    iconToRender = <MoviesIcon />;
    glowStyle = "from-sky-500/15 to-blue-600/5 text-sky-300 border-sky-500/30 shadow-[0_0_12px_rgba(14,165,233,0.25)]";
  } else if (categoryStr === "sports") {
    iconToRender = <SportsIcon />;
    glowStyle = "from-emerald-500/15 to-emerald-600/5 text-emerald-300 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.25)]";
  }

  const coverToUse = (plan.id === "P001" || plan.category === "sports" || plan.title.toLowerCase().includes("football") || plan.title.toLowerCase().includes("turf"))
    ? "/navkis_matchday.png"
    : plan.coverImage;

  // DB-accurate counts from plan.members (joinState mapped from plan_participants.status)
  const maxSpots = plan.maxSpots || (plan.category === "movies" ? 10 : plan.category === "sports" ? 14 : 8);
  const goingMembers = plan.members.filter(m => m.joinState === "going" || m.joinState === "host");
  const currentCount = goingMembers.length;
  const isFull = currentCount >= maxSpots;

  let barGradient = "from-[#ff8b66] to-[#fc5c42]";
  let categoryColorDot = "bg-[#ff8b66]";

  if (categoryStr === "sunset" || categoryStr === "brunch" || categoryStr === "restaurants" || categoryStr === "cafe") {
    barGradient = "from-rose-400 to-pink-500";
    categoryColorDot = "bg-rose-400";
  } else if (categoryStr === "movies") {
    barGradient = "from-sky-400 to-blue-500";
    categoryColorDot = "bg-sky-450";
  }

  let groupName = "Midnight Masala";
  let groupColor = "text-[#ff8b66]";

  if (categoryStr === "sports" || (plan.category as string) === "football" || plan.title.toLowerCase().includes("football") || plan.title.toLowerCase().includes("turf")) {
    groupName = "Navkis Matchday";
    groupColor = "text-emerald-400";
  } else if (categoryStr === "movies" || plan.title.toLowerCase().includes("movie")) {
    groupName = "Jobis";
    groupColor = "text-sky-400";
  } else if (categoryStr === "sunset" || categoryStr === "brunch" || categoryStr === "restaurants" || categoryStr === "cafe" || plan.title.toLowerCase().includes("waffles") || plan.title.toLowerCase().includes("spice")) {
    groupName = "Midnight Masala";
    groupColor = "text-rose-400";
  }

  const startHolding = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    if (holdDelayTimeoutRef.current) {
      clearTimeout(holdDelayTimeoutRef.current);
      holdDelayTimeoutRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) { }

    pointerDownTimeRef.current = performance.now();
    hasHoldStartedRef.current = false;
    isHoldTriggeredRef.current = false;
    startYRef.current = e.clientY;
    isDraggingRef.current = false;
    setDragY(0);

    holdDelayTimeoutRef.current = setTimeout(() => {
      hasHoldStartedRef.current = true;
      setIsHolding(true);
      setHoldProgress(0);
      progressRef.current = 0;

      const startTime = performance.now();
      holdStartTimeRef.current = startTime;

      const tick = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / HOLD_DURATION, 1);
        setHoldProgress(progress * 100);
        progressRef.current = progress;

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(tick);
        } else {
          setIsHolding(false);
          isHoldTriggeredRef.current = true;

          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }

          if (isJoined) {
            triggerToast("You're already in this plan! Head over to Circles tab to chat.");
          } else if (isWaitlisted) {
            triggerToast("You're already on the waitlist for this plan!");
          } else if (isFull) {
            if (waitlistPlan) {
              waitlistPlan(plan.id, userProfile);
              triggerToast("Added to Waitlist");
              const waitlistNotification: NotificationItem = {
                id: `n_waitlist_${Date.now()}`,
                type: "general" as const,
                title: `⏳ Added to waitlist for "${plan.title}"`,
                relativeTime: "Just Now",
                settled: true,
                planId: plan.id
              };
              setNotifications(prev => [waitlistNotification, ...prev]);
              if (setShowWaitlistSuccess) {
                setShowWaitlistSuccess(plan);
              }
            }
          } else {
            setSuccessMode("join");
            handleToggleJoin(plan);

            const newNotification: NotificationItem = {
              id: `n_pay_${Date.now()}`,
              type: "payment" as const,
              title: "Split Coordinated Payment Cleared",
              relativeTime: "Just Now",
              settled: true,
              planId: plan.id
            };

            const joinedNotification: NotificationItem = {
              id: `n_join_group_${Date.now()}`,
              type: "general" as const,
              title: `👋 You joined ${plan.creatorName || "host"}'s plan "${plan.title}"`,
              relativeTime: "Just Now",
              settled: true,
              planId: plan.id
            };

            setNotifications(prev => [newNotification, joinedNotification, ...prev]);
            setShowPaymentSuccess(plan);
          }

          setTimeout(() => {
            setHoldProgress(0);
            progressRef.current = 0;
          }, 400);
        }
      };

      animationFrameRef.current = requestAnimationFrame(tick);
    }, 400);
  };

  const stopHolding = (e: React.PointerEvent) => {
    if (holdDelayTimeoutRef.current) {
      clearTimeout(holdDelayTimeoutRef.current);
      holdDelayTimeoutRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) { }

    const currentDragY = dragY;
    startYRef.current = 0;
    setDragY(0);

    if (isDraggingRef.current) {
      if (currentDragY > 120) {
        handleSnoozePlan(plan.id);
      }
      return;
    }

    if (!hasHoldStartedRef.current) {
      setIsHolding(false);
      setHoldProgress(0);
      progressRef.current = 0;
      onSelectCard(activeCardId === plan.id ? "" : plan.id);
      return;
    }

    setIsHolding(false);

    if (progressRef.current < 1) {
      const startProgress = progressRef.current;
      const startReleaseTime = performance.now();
      const DECREASE_DURATION = 350;

      const releaseTick = (now: number) => {
        const elapsedRelease = now - startReleaseTime;
        const relProgress = Math.min(elapsedRelease / DECREASE_DURATION, 1);
        const newProgress = startProgress * (1 - relProgress);
        setHoldProgress(newProgress * 100);
        progressRef.current = newProgress;

        if (relProgress < 1) {
          animationFrameRef.current = requestAnimationFrame(releaseTick);
        } else {
          setHoldProgress(0);
          progressRef.current = 0;
        }
      };

      animationFrameRef.current = requestAnimationFrame(releaseTick);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (startYRef.current === 0) return;
    const deltaY = e.clientY - startYRef.current;
    if (Math.abs(deltaY) > 10) {
      isDraggingRef.current = true;
      if (holdDelayTimeoutRef.current) {
        clearTimeout(holdDelayTimeoutRef.current);
        holdDelayTimeoutRef.current = null;
      }
      if (isHolding) {
        setIsHolding(false);
      }
    }
    if (deltaY > 0) {
      setDragY(deltaY);
    }
  };

  const cancelHolding = (e: React.PointerEvent) => {
    if (holdDelayTimeoutRef.current) {
      clearTimeout(holdDelayTimeoutRef.current);
      holdDelayTimeoutRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) { }

    const currentDragY = dragY;
    startYRef.current = 0;
    setDragY(0);

    if (isDraggingRef.current) {
      if (currentDragY > 120) {
        handleSnoozePlan(plan.id);
      }
      return;
    }

    setIsHolding(false);

    if (hasHoldStartedRef.current && progressRef.current < 1) {
      const startProgress = progressRef.current;
      const startReleaseTime = performance.now();
      const DECREASE_DURATION = 350;

      const releaseTick = (now: number) => {
        const elapsedRelease = now - startReleaseTime;
        const relProgress = Math.min(elapsedRelease / DECREASE_DURATION, 1);
        const newProgress = startProgress * (1 - relProgress);
        setHoldProgress(newProgress * 100);
        progressRef.current = newProgress;

        if (relProgress < 1) {
          animationFrameRef.current = requestAnimationFrame(releaseTick);
        } else {
          setHoldProgress(0);
          progressRef.current = 0;
        }
      };

      animationFrameRef.current = requestAnimationFrame(releaseTick);
    } else {
      setHoldProgress(0);
      progressRef.current = 0;
    }
  };

  const costOpacity = Math.max(0, Math.min(1, (holdProgress - 15) / 25));
  const costY = 16 * (1 - costOpacity);
  const timeOpacity = Math.max(0, Math.min(1, (holdProgress - 40) / 25));
  const timeY = 16 * (1 - timeOpacity);
  const locOpacity = Math.max(0, Math.min(1, (holdProgress - 65) / 25));
  const locY = 16 * (1 - locOpacity);

  return (
    <div
      className="w-full h-full snap-start shrink-0 relative flex flex-col justify-end p-6 select-none overflow-hidden cursor-pointer touch-none"
      style={{
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
        height: '100%',
        boxShadow: isHolding
          ? `0 0 ${15 + (holdProgress / 100) * 35}px rgba(255, 139, 102, ${0.15 + (holdProgress / 100) * 0.45})`
          : 'none',
        transform: isHolding ? `scale(${1 - (holdProgress / 100) * 0.035})` : 'scale(1)',
        transition: isHolding ? 'none' : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease'
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
            style={getDynamicTitleStyle(displayActivityName)}
            className="font-sans font-extrabold text-white drop-shadow-md max-w-full pr-1 tracking-tight leading-tight"
          >
            {displayActivityName}
          </h2>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2 text-stone-100 drop-shadow-sm font-semibold text-[11px] uppercase tracking-wider font-mono">
              <span className="text-amber-400">📅</span>
              <span>{getFormattedDateAndTime()}</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-200 drop-shadow-sm font-sans text-[11px] tracking-wide">
              <span className="text-brand-peach">📍</span>
              <span className="truncate max-w-[85%]">{plan.location}</span>
            </div>

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
        {isHolding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col justify-between p-8 pointer-events-none"
            style={{
              backgroundColor: `rgba(4, 4, 6, ${0.4 + (holdProgress / 100) * 0.45})`,
              backdropFilter: `blur(${(holdProgress / 100) * 8}px)`,
              WebkitBackdropFilter: `blur(${(holdProgress / 100) * 8}px)`,
            }}
          >
            <div className="h-6" />

            <div className="flex-1 flex flex-col justify-center space-y-7 my-auto pt-6">
              <div
                style={{
                  opacity: costOpacity,
                  transform: `translateY(${costY}px)`,
                  transition: 'opacity 0.1s ease-out, transform 0.1s ease-out'
                }}
                className="space-y-1"
              >
                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block font-medium">Split Requirement</span>
                <div className="text-2xl font-black text-white flex items-baseline gap-1">
                  <span>{plan.cost > 0 ? `₹${plan.cost}` : "Free Entry"}</span>
                  <span className="text-zinc-500 text-xs font-normal lowercase">per person split</span>
                </div>
              </div>

              <div
                style={{
                  opacity: timeOpacity,
                  transform: `translateY(${timeY}px)`,
                  transition: 'opacity 0.1s ease-out, transform 0.1s ease-out'
                }}
                className="space-y-1"
              >
                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block font-medium">Scheduled Hour</span>
                <div className="text-xl font-bold text-white uppercase tracking-tight">
                  {getFormattedDateAndTime()}
                </div>
              </div>

              <div
                style={{
                  opacity: locOpacity,
                  transform: `translateY(${locY}px)`,
                  transition: 'opacity 0.1s ease-out, transform 0.1s ease-out'
                }}
                className="space-y-1"
              >
                <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest block font-medium">Coordinated Venue</span>
                <div className="text-base font-medium text-zinc-200 leading-snug tracking-wide">
                  {plan.location}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center space-y-4 w-full pb-2">
              <div className="relative w-14 h-14 flex items-center justify-center">
                <svg className="w-14 h-14 transform -rotate-90">
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    className="stroke-zinc-900"
                    strokeWidth="3.5"
                    fill="transparent"
                  />
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    className={isFull ? "stroke-amber-400" : "stroke-[#ff8b66]"}
                    strokeWidth="3.5"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 24}
                    strokeDashoffset={2 * Math.PI * 24 * (1 - holdProgress / 100)}
                    strokeLinecap="round"
                    style={{
                      filter: isFull ? 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.4))' : 'drop-shadow(0 0 6px rgba(255, 139, 102, 0.4))'
                    }}
                  />
                </svg>
                <span className="absolute text-[11px] font-mono text-white font-black">{Math.round(holdProgress)}%</span>
              </div>
            </div>
          </motion.div>
        )}

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
      </AnimatePresence>
    </div>
  );
};

export interface HomeScreenProps {
  discoverablePlans: Plan[];
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
  setActiveCardId: (planId: string) => void;
  handleSnoozePlan: (planId: string) => void;
  handleWaitlistPlan?: (planId: string, userProfile: any) => void;
  homeFeedRef: React.RefObject<HTMLDivElement | null>;
}

export const HomeScreen = ({
  discoverablePlans,
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
  setActiveCardId,
  handleSnoozePlan,
  handleWaitlistPlan,
  homeFeedRef
}: HomeScreenProps) => {
  const N = discoverablePlans.length;
  const plansToRender = N > 1
    ? [
      { ...discoverablePlans[N - 1], id: `${discoverablePlans[N - 1].id}-loop-prev-dup` },
      ...discoverablePlans,
      { ...discoverablePlans[0], id: `${discoverablePlans[0].id}-loop-next-dup` }
    ]
    : discoverablePlans;

  const handleScrollLoop = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const { scrollTop, clientHeight } = target;
    if (N <= 1) return;

    const maxThreshold = (N + 1) * clientHeight - 10;
    if (scrollTop >= maxThreshold) {
      target.scrollTop = clientHeight;
    } else if (scrollTop <= 10) {
      target.scrollTop = N * clientHeight;
    }
  };

  return (
    <div id="home_tab_pane" className="w-full h-full relative overflow-hidden bg-[#0C0C0E]">
      {discoverablePlans.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4">
          <span className="text-4xl text-zinc-650 animate-pulse">✨</span>
          <p className="text-zinc-400 font-sans text-xs max-w-xs leading-relaxed">
            You have joined all active plans! Head to the <strong className="text-brand-orange">Circles</strong> or <strong className="text-brand-orange">Plans Board</strong> tab to view and coordinate.
          </p>
        </div>
      ) : (
        <div
          id="home_swipe_feed"
          ref={homeFeedRef}
          className="h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar"
          style={{
            scrollSnapType: 'y mandatory',
            WebkitOverflowScrolling: 'touch'
          }}
          onScroll={handleScrollLoop}
        >
          {plansToRender.map((plan) => (
            <PlanReelCard
              key={plan.id}
              plan={plan}
              userProfile={userProfile}
              interestedPlanIds={interestedPlanIds}
              setSelectedPlan={setSelectedPlan}
              setPaymentConfirmationPlan={setPaymentConfirmationPlan}
              walletBalance={walletBalance}
              handleToggleJoin={handleToggleJoin}
              setShowPaymentSuccess={setShowPaymentSuccess}
              setShowWaitlistSuccess={setShowWaitlistSuccess}
              setNotifications={setNotifications}
              triggerToast={triggerToast}
              activeCardId={activeCardId}
              onSelectCard={setActiveCardId}
              handleSnoozePlan={handleSnoozePlan}
              waitlistPlan={handleWaitlistPlan}
            />
          ))}
        </div>
      )}
    </div>
  );
};

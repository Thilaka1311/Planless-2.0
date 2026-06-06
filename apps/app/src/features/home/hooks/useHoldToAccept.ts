import React, { useState, useRef } from "react";
import { Plan, UserProfile, NotificationItem } from "../../../core/types";

interface UseHoldToAcceptProps {
  plan: Plan;
  userProfile: UserProfile;
  isDeadlinePassed: boolean;
  isJoined: boolean;
  isWaitlisted: boolean;
  isFull: boolean;
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

export function useHoldToAccept({
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
}: UseHoldToAcceptProps) {
  const HOLD_DURATION = 1400; // ms
  const [holdProgress, setHoldProgress] = useState(0); // 0 to 100
  const [isHolding, setIsHolding] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMode, setSuccessMode] = useState<"join" | "waitlist">("join");
  const [isExpanded, setIsExpanded] = useState(false);

  const startYRef = useRef<number>(0);
  const [dragY, setDragY] = useState<number>(0);
  const isDraggingRef = useRef<boolean>(false);

  const holdStartTimeRef = useRef<number>(0);
  const progressRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const isHoldTriggeredRef = useRef<boolean>(false);

  const holdDelayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerDownTimeRef = useRef<number>(0);
  const hasHoldStartedRef = useRef<boolean>(false);

  const startHolding = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;

    if (isDeadlinePassed) {
      triggerToast("Responses are closed for this plan.");
      return;
    }

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
    } catch (err) {}

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
                planId: plan.id,
              };
              setNotifications((prev) => [waitlistNotification, ...prev]);
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
              planId: plan.id,
            };

            const joinedNotification: NotificationItem = {
              id: `n_join_group_${Date.now()}`,
              type: "general" as const,
              title: `👋 You joined ${plan.creatorName || "host"}'s plan "${plan.title}"`,
              relativeTime: "Just Now",
              settled: true,
              planId: plan.id,
            };

            setNotifications((prev) => [newNotification, joinedNotification, ...prev]);
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
    } catch (err) {}

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
    } catch (err) {}

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

  return {
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
  };
}

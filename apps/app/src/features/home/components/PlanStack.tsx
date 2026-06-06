import React from "react";
import { Plan, UserProfile, NotificationItem } from "../../../core/types";
import { PlanCard } from "./PlanCard";

interface PlanStackProps {
  plansToRender: Plan[];
  handleScrollLoop: (e: React.UIEvent<HTMLDivElement>) => void;
  homeFeedRef: React.RefObject<HTMLDivElement | null>;
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
}

export const PlanStack: React.FC<PlanStackProps> = ({
  plansToRender,
  handleScrollLoop,
  homeFeedRef,
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
}) => {
  return (
    <div
      id="home_swipe_feed"
      ref={homeFeedRef}
      className="h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar"
      style={{
        scrollSnapType: "y mandatory",
        WebkitOverflowScrolling: "touch",
      }}
      onScroll={handleScrollLoop}
    >
      {plansToRender.map((plan) => (
        <PlanCard
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
          onSelectCard={(id) => {
            setActiveCardId(id);
            if (id) {
              const selected = plansToRender.find((p) => p.id === id);
              if (selected) {
                setSelectedPlan(selected);
              }
            }
          }}
          handleSnoozePlan={handleSnoozePlan}
          waitlistPlan={handleWaitlistPlan}
        />
      ))}
    </div>
  );
};

import React from "react";
import { UserProfile, Plan, NotificationItem } from "../../../core/types";
import { EmptyState } from "../components/EmptyState";
import { FeedHeader } from "../components/FeedHeader";
import { FeedFilters } from "../components/FeedFilters";
import { PlanStack } from "../components/PlanStack";
import { useHomeFeed } from "../hooks/useHomeFeed";
import { usePlansStore } from "../../../features/plans/state/PlansContext";
import { getMemoryContribution, hasOutstandingMemoryAction } from "../../../lib/memoryContribution";
import { Star } from "lucide-react";

export interface HomeScreenProps {
  discoverablePlans: Plan[];
  userProfile: UserProfile;
  interestedPlanIds: string[];
  setSelectedPlan: (plan: Plan | null) => void;
  setSelectedMemoryPlan: (plan: Plan | null) => void;
  setPaymentConfirmationPlan: (plan: Plan | null) => void;
  walletBalance: number;
  handleToggleJoin: (plan: Plan) => void;
  setShowPaymentSuccess: (plan: Plan | null) => void;
  setShowWaitlistSuccess?: (plan: Plan | null) => void;
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  triggerToast: (msg: string) => void;
  activeCardId: string | null;
  setActiveCardId: (id: string | null) => void;
  handleSnoozePlan: (planId: string) => void;
  handleWaitlistPlan: (planId: string) => void;
  homeFeedRef: React.RefObject<HTMLDivElement | null>;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  discoverablePlans,
  userProfile,
  interestedPlanIds,
  setSelectedPlan,
  setSelectedMemoryPlan,
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
  homeFeedRef,
}) => {
  const {
    plans,
    dbMemories,
    dbMemoryAttendees,
    dbMemoryMovieVerdicts,
    dbMemoryRestaurantVotes,
    dbMemoryMatchResults,
    dbMemoryMvpVotes,
    dbMemoryBadmintonResults
  } = usePlansStore();
  const { plansToRender, handleScrollLoop } = useHomeFeed(discoverablePlans);
  
  const userId = userProfile.dbUuid || userProfile.user_id || "";

  // Query pending memory prompts
  const completedPlans = plans.filter(p => p.status === "completed" || p.isHappened);
  const pendingPrompts = completedPlans
    .map(plan => {
      const memory = dbMemories.find(m => m.plan_id === plan.id || m.plan_id === plan.dbUuid);
      if (!memory) return null;

      const attendees = dbMemoryAttendees.filter(a => a.memory_id === memory.id);
      const verdicts = dbMemoryMovieVerdicts.filter(v => v.memory_id === memory.id);
      const votes = dbMemoryRestaurantVotes.filter(v => v.memory_id === memory.id);
      const results = dbMemoryMatchResults.filter(r => r.memory_id === memory.id);
      const mvps = dbMemoryMvpVotes.filter(v => v.memory_id === memory.id);
      const badmintons = dbMemoryBadmintonResults.filter(r => r.memory_id === memory.id);
      const isHost = plan.hostId === "u_self" || plan.hostId === userId;

      const contrib = getMemoryContribution(
        memory,
        userId,
        isHost,
        attendees,
        verdicts,
        votes,
        results,
        mvps,
        badmintons
      );

      const isPending = hasOutstandingMemoryAction(
        memory,
        userId,
        isHost,
        attendees,
        verdicts,
        votes,
        results,
        mvps,
        badmintons
      );

      if (!isPending) return null;

      let title = "";
      let body = "";
      let cta = "";

      const mType = (memory.memory_type || "").toLowerCase();
      if (mType === "movie") {
        title = "Movie Night is complete";
        body = "How was the movie? Loved it, good, or not for you?";
        cta = "Rate Verdict";
      } else if (mType === "dining") {
        title = "Dinner is complete";
        body = "Would you return to this restaurant?";
        cta = "Record Verdict";
      } else if (mType === "football" || mType === "badminton") {
        const hasResult = results.some(r => r.memory_id === memory.id);
        if (!hasResult) {
          title = `${mType.toUpperCase()} session is complete`;
          body = isHost ? "Record the final match score." : "Waiting for host to record score.";
          cta = isHost ? "Record Result" : "View Memory";
        } else {
          title = `${mType.toUpperCase()} session is complete`;
          body = "Vote for today's MVP!";
          cta = "Vote MVP";
        }
      }

      return {
        plan,
        memory,
        contrib,
        title,
        body,
        cta,
        createdAtTime: new Date(memory.created_at).getTime(),
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => a.createdAtTime - b.createdAtTime);

  const activePrompt = pendingPrompts[0] || null;

  const handleSelectPlan = (plan: Plan | null) => {
    if (plan && plan.status === "completed") {
      setSelectedMemoryPlan(plan);
      return;
    }
    setSelectedPlan(plan);
  };

  return (
    <div id="home_tab_pane" className="w-full h-full relative overflow-hidden bg-[#0C0C0E]">
      <FeedHeader />
      <FeedFilters />
      
      {/* Memory Contribution Prompt Callout */}
      {activePrompt && (
        <div 
          id="memory_contribution_prompt"
          className="mx-4 mb-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_4px_20px_rgba(245,158,11,0.05)] animate-fade-in text-left shrink-0"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <Star className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h4 className="text-xs font-sans font-black uppercase tracking-wide text-zinc-100">
                {activePrompt.title}
              </h4>
              <p className="text-[10.5px] font-sans text-zinc-400 mt-0.5 leading-snug">
                {activePrompt.body}
              </p>
            </div>
          </div>
          <button
            id="memory_contribution_cta"
            type="button"
            onClick={() => setSelectedMemoryPlan(activePrompt.plan)}
            className="self-start sm:self-center px-3 py-1.5 bg-[#ff8b66] hover:bg-[#ff9a7c] text-black text-[9.5px] font-black uppercase tracking-wider rounded-xl transition-all active:scale-[0.97] cursor-pointer shadow shrink-0"
          >
            {activePrompt.cta}
          </button>
        </div>
      )}

      {discoverablePlans.length === 0 ? (
        <EmptyState />
      ) : (
        <PlanStack
          plansToRender={plansToRender}
          handleScrollLoop={handleScrollLoop}
          homeFeedRef={homeFeedRef}
          userProfile={userProfile}
          interestedPlanIds={interestedPlanIds}
          setSelectedPlan={handleSelectPlan}
          setPaymentConfirmationPlan={setPaymentConfirmationPlan}
          walletBalance={walletBalance}
          handleToggleJoin={handleToggleJoin}
          setShowPaymentSuccess={setShowPaymentSuccess}
          setShowWaitlistSuccess={setShowWaitlistSuccess}
          setNotifications={setNotifications}
          triggerToast={triggerToast}
          activeCardId={activeCardId}
          setActiveCardId={setActiveCardId}
          handleSnoozePlan={handleSnoozePlan}
          handleWaitlistPlan={handleWaitlistPlan}
        />
      )}
    </div>
  );
};

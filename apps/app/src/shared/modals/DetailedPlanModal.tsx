import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Plan, UserProfile } from "../../core/types";
import { normalizeStatus } from "../../lib/participantStatus";
import { usePlansStore } from "../../features/plans/state/PlansContext";

interface DetailedPlanModalProps {
  selectedPlan: Plan;
  onClose: () => void;
  userProfile: UserProfile;
  activeUserId?: string;
  triggerToast: (msg: string) => void;
  setSelectedMemoryPlan?: (plan: Plan) => void;
}

export default function DetailedPlanModal({
  selectedPlan,
  onClose,
  userProfile,
  activeUserId,
  triggerToast,
  setSelectedMemoryPlan,
}: DetailedPlanModalProps) {
  const { getParticipantCounts, dbPlanParticipants, markPlanSeen, skipPlan, rejoinPlan, acceptPlan, joinPlan, leavePlan, changePlanHost, cancelPlan, completePlan } = usePlansStore();
  const [isSkipping, setIsSkipping] = useState(false);
  const [isRejoining, setIsRejoining] = useState(false);
  const [isJoiningDirect, setIsJoiningDirect] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  
  const [showChangeHostList, setShowChangeHostList] = useState(false);
  const [isChangingHost, setIsChangingHost] = useState(false);
  const [showDitchConfirm, setShowDitchConfirm] = useState(false);
  const [isDitching, setIsDitching] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [selectedNewHost, setSelectedNewHost] = useState<{ userId: string; name: string } | null>(null);

  const planUuid = (selectedPlan as any).dbUuid || selectedPlan.id;
  const counts = getParticipantCounts(planUuid);

  // Determine current user's participant role
  const isHost = selectedPlan.creatorName === userProfile.name;

  // Find current user's participant record
  const myParticipantRecord = React.useMemo(() => {
    const planUuidForPp = (selectedPlan as any).dbUuid || selectedPlan.id;
    const resolvedUserUuid = userProfile.dbUuid || activeUserId;
    return dbPlanParticipants.find(
      pp => pp.plan_id === planUuidForPp && (pp.user_id === resolvedUserUuid || pp.user_id === activeUserId || pp.user_id === (selectedPlan.members.find(m => m.name === userProfile.name)?.userId))
    );
  }, [dbPlanParticipants, selectedPlan, activeUserId, userProfile]);

  React.useEffect(() => {
    if (activeUserId && myParticipantRecord?.status === "delivered") {
      markPlanSeen(selectedPlan.id, activeUserId);
    }
  }, [selectedPlan.id, activeUserId, myParticipantRecord?.status, markPlanSeen]);

  const alreadySkipped = normalizeStatus(myParticipantRecord?.status) === "skipped";

  const handleSkip = async () => {
    if (!activeUserId || isSkipping) return;
    setIsSkipping(true);
    try {
      await skipPlan(selectedPlan.id, activeUserId);
      triggerToast("Plan skipped");
      onClose();
    } catch (err) {
      triggerToast("Failed to skip plan");
    } finally {
      setIsSkipping(false);
    }
  };

  const handleRejoin = async () => {
    if (!activeUserId || isRejoining) return;
    setIsRejoining(true);
    try {
      await rejoinPlan(selectedPlan.id, userProfile);
      triggerToast("Plan joined");
    } catch (err) {
      triggerToast("Failed to join plan");
    } finally {
      setIsRejoining(false);
    }
  };

  const handleJoinDirect = async () => {
    if (isJoiningDirect) return;
    setIsJoiningDirect(true);
    try {
      await joinPlan(selectedPlan.id, userProfile);
      triggerToast("Joined plan successfully!");
      onClose();
    } catch (err) {
      triggerToast("Failed to join plan");
    } finally {
      setIsJoiningDirect(false);
    }
  };

  const handleSkipConfirm = async () => {
    if (!activeUserId || isLeaving) return;
    setIsLeaving(true);
    try {
      await skipPlan(selectedPlan.id, activeUserId);
      triggerToast("Plan skipped successfully");
      setShowLeaveConfirm(false);
      onClose();
    } catch (err) {
      triggerToast("Failed to skip plan");
    } finally {
      setIsLeaving(false);
    }
  };

  const handleDitchConfirm = async () => {
    if (isDitching) return;
    setIsDitching(true);
    try {
      await cancelPlan(selectedPlan.id);
      triggerToast("Plan ditched/cancelled successfully");
      setShowDitchConfirm(false);
      onClose();
    } catch (err) {
      triggerToast("Failed to ditch plan");
    } finally {
      setIsDitching(false);
    }
  };

  const handleCompletePlan = async () => {
    console.log("COMPLETE_HANDLER_ENTERED", {
      planId: selectedPlan.id,
      planDbUuid: selectedPlan.dbUuid,
      planStatus: selectedPlan.status,
      isCompleting,
    });
    if (isCompleting) return;
    setIsCompleting(true);
    try {
      await completePlan(selectedPlan.dbUuid || selectedPlan.id);
      triggerToast("Plan marked completed successfully");
      if (setSelectedMemoryPlan) {
        setSelectedMemoryPlan({
          ...selectedPlan,
          status: "completed"
        });
      }
      onClose();
    } catch (err) {
      console.error("COMPLETE_HANDLER_ERROR", err);
      triggerToast("Failed to complete plan");
    } finally {
      setIsCompleting(false);
    }
  };

  const handleChangeHostConfirm = async () => {
    if (!selectedNewHost || isChangingHost || !activeUserId) return;
    setIsChangingHost(true);
    try {
      await changePlanHost(selectedPlan.id, selectedNewHost.userId, activeUserId);
      triggerToast(`Ownership transferred to ${selectedNewHost.name}`);
      setSelectedNewHost(null);
      setShowChangeHostList(false);
      onClose();
    } catch (err) {
      triggerToast("Failed to transfer ownership");
    } finally {
      setIsChangingHost(false);
    }
  };

  const eligibleParticipants = React.useMemo(() => {
    return selectedPlan.members.filter(
      m => m.userId !== activeUserId && m.userId !== userProfile.dbUuid && m.joinState !== "skipped" && m.joinState !== "passed"
    );
  }, [selectedPlan.members, activeUserId, userProfile.dbUuid]);

  // Response deadline text
  const responseDeadlineText = selectedPlan.response_deadline_at
    ? new Date(selectedPlan.response_deadline_at).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "No deadline";

  const currentStatus = normalizeStatus(myParticipantRecord?.status);
  const showJoinDirect = ["delivered", "seen", "waitlist", "new"].includes(currentStatus);
  const isJoinedOrWaitlisted = currentStatus === "going" || currentStatus === "waitlist";

  return (
    <div
      id="detailed_plan_modal"
      className="absolute inset-0 bg-black/95 backdrop-blur-md z-45 flex flex-col justify-between animate-fade-in touch-none select-none overflow-hidden"
    >
      {showLeaveConfirm && (
        <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-6 space-y-6 z-50 animate-fade-in">
          <div className="bg-[#0C0C0E]/90 backdrop-blur-md border border-zinc-900 rounded-3xl p-6 w-full max-w-xs text-center space-y-4 shadow-2xl">
            <h3 className="text-base font-display font-black text-white uppercase tracking-wider">Skip Plan?</h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
              Are you sure you want to skip this plan?
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950/60 text-zinc-400 text-[10px] font-mono font-bold uppercase tracking-wider hover:bg-zinc-900 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSkipConfirm}
                disabled={isLeaving}
                className="flex-1 py-2.5 rounded-xl bg-[#ff5e3a] hover:bg-[#ff4e2a] text-white text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shadow-[0_4px_16px_rgba(255,94,58,0.2)] disabled:opacity-40"
              >
                {isLeaving ? "Skipping…" : "Skip Plan"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Ditch Plan confirmation overlay */}
      {showDitchConfirm && (
        <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-6 space-y-6 z-50 animate-fade-in text-center">
          <div className="bg-[#0C0C0E]/90 backdrop-blur-md border border-zinc-900 rounded-3xl p-6 w-full max-w-xs text-center space-y-4 shadow-2xl">
            <h3 className="text-base font-display font-black text-white uppercase tracking-wider">Ditch Plan?</h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
              This will permanently close the plan for all participants.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDitchConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950/60 text-zinc-400 text-[10px] font-mono font-bold uppercase tracking-wider hover:bg-zinc-900 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDitchConfirm}
                disabled={isDitching}
                className="flex-1 py-2.5 rounded-xl bg-rose-650 hover:bg-rose-600 text-white text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shadow-[0_4px_16px_rgba(239,68,68,0.2)] disabled:opacity-40"
              >
                {isDitching ? "Ditching…" : "Ditch Plan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Host List Overlay */}
      {showChangeHostList && (
        <div className="absolute inset-0 bg-black/95 flex flex-col z-50 animate-fade-in text-left">
          <div className="p-4 flex items-center justify-between border-b border-zinc-900">
            <button
              onClick={() => setShowChangeHostList(false)}
              className="text-zinc-500 hover:text-white flex items-center gap-1.5 text-xs focus:outline-none"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#ff8b66] font-bold">
              Select New Host
            </span>
            <div className="w-10" />
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4">
            <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
              Transfer ownership of this plan. You will no longer be the host and will become a normal participant.
            </p>
            {eligibleParticipants.length === 0 ? (
              <div className="py-8 text-center text-zinc-500 text-xs font-mono">
                No eligible participants available to transfer ownership.
              </div>
            ) : (
              <div className="space-y-2">
                {eligibleParticipants.map(member => (
                  <button
                    key={member.userId}
                    onClick={() => setSelectedNewHost({ userId: member.userId, name: member.name })}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-900 hover:border-zinc-800 transition-all text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-8 h-8 rounded-full border border-zinc-800"
                      />
                      <div>
                        <div className="text-xs font-semibold text-zinc-200">{member.name}</div>
                        <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
                          Status: {member.joinState}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-[#ff8b66] uppercase tracking-wider font-bold">
                      Select
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm Host Change Overlay */}
      {selectedNewHost && (
        <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-6 space-y-6 z-55 animate-fade-in text-center">
          <div className="bg-[#0C0C0E]/90 backdrop-blur-md border border-zinc-900 rounded-3xl p-6 w-full max-w-xs text-center space-y-4 shadow-2xl">
            <h3 className="text-base font-display font-black text-white uppercase tracking-wider">Transfer Host?</h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
              Are you sure you want to transfer ownership of this plan to <span className="text-zinc-200 font-semibold">{selectedNewHost.name}</span>?
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedNewHost(null)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950/60 text-zinc-400 text-[10px] font-mono font-bold uppercase tracking-wider hover:bg-zinc-900 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleChangeHostConfirm}
                disabled={isChangingHost}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shadow-[0_4px_16px_rgba(16,185,129,0.2)] disabled:opacity-40"
              >
                {isChangingHost ? "Transferring…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header block */}
      <div className="p-4 flex items-center justify-between border-b border-zinc-900">
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-white flex items-center gap-1.5 text-xs focus:outline-none"
        >
          <ArrowLeft className="w-4 h-4" /> Close
        </button>
        <span className="text-[11px] font-sans text-zinc-400 font-medium tracking-wide">
          Host: <span className="text-zinc-200 font-semibold">{selectedPlan.creatorName}</span>
        </span>
        <div className="w-10" /> {/* Spacer */}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
        {/* Header Section */}
        <div className="text-left space-y-1">
          <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#ff8b66] font-bold">
            {selectedPlan.category?.toUpperCase() || "PLAN"}
          </span>
          <h2 className="text-2xl font-display font-black text-white leading-tight uppercase tracking-tight">
            {selectedPlan.title}
          </h2>
          <p className="text-xs text-zinc-400">
            Hosted by <span className="text-zinc-200 font-semibold">{selectedPlan.creatorName}</span>
          </p>
        </div>

        {/* Details Section */}
        <div className="bg-zinc-905 border border-zinc-900 rounded-3xl p-5 space-y-4 text-left select-none">
          <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500 font-bold">Details</span>
          
          <div className="grid grid-cols-1 gap-3 py-1">
            <div className="flex items-center gap-3">
              <span className="text-xs">📍</span>
              <span className="text-xs text-zinc-350 truncate">{selectedPlan.location}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs">📅</span>
              <span className="text-xs text-zinc-300 font-mono">{selectedPlan.date}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs">⏰</span>
              <span className="text-xs text-zinc-300 font-mono">{selectedPlan.time}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs">⌛</span>
              <span className="text-xs text-zinc-400 font-mono">Deadline: {responseDeadlineText}</span>
            </div>
          </div>
        </div>

        {/* Attendance Section */}
        <div className="bg-zinc-905 border border-zinc-900 rounded-3xl p-5 space-y-3.5 text-left select-none">
          <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500 font-bold block">
            Attendance Summary
          </span>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-zinc-950/60 rounded-xl p-2 border border-white/[0.01]">
              <div className="text-xs font-mono font-bold text-zinc-300">{counts.host}</div>
              <div className="text-[7.5px] font-mono text-zinc-500 uppercase tracking-wider mt-0.5">Host</div>
            </div>
            <div className="bg-zinc-950/60 rounded-xl p-2 border border-white/[0.01]">
              <div className="text-xs font-mono font-bold text-emerald-400">{counts.going}</div>
              <div className="text-[7.5px] font-mono text-zinc-500 uppercase tracking-wider mt-0.5">Going</div>
            </div>
            <div className="bg-zinc-950/60 rounded-xl p-2 border border-white/[0.01]">
              <div className="text-xs font-mono font-bold text-amber-500">{counts.waitlist}</div>
              <div className="text-[7.5px] font-mono text-zinc-500 uppercase tracking-wider mt-0.5">Waitlist</div>
            </div>
            <div className="bg-zinc-950/60 rounded-xl p-2 border border-white/[0.01]">
              <div className="text-xs font-mono font-bold text-sky-400">{counts.seen}</div>
              <div className="text-[7.5px] font-mono text-zinc-500 uppercase tracking-wider mt-0.5">Seen</div>
            </div>
            <div className="bg-zinc-950/60 rounded-xl p-2 border border-white/[0.01]">
              <div className="text-xs font-mono font-bold text-rose-500">{counts.skipped}</div>
              <div className="text-[7.5px] font-mono text-zinc-500 uppercase tracking-wider mt-0.5">Skipped</div>
            </div>
            <div className="bg-zinc-950/60 rounded-xl p-2 border border-white/[0.01]">
              <div className="text-xs font-mono font-bold text-zinc-450">{counts.delivered}</div>
              <div className="text-[7.5px] font-mono text-zinc-500 uppercase tracking-wider mt-0.5">Delivered</div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions Section */}
      <div className="px-6 pb-6 shrink-0 flex flex-col gap-3">
        {isHost ? (
          <div className="flex flex-col gap-2.5 w-full animate-fade-in">
            <div className="w-full py-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-center text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider">
              ✓ You're Hosting
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowChangeHostList(true)}
                className="flex-1 py-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-zinc-200 text-xs font-mono font-semibold uppercase tracking-wider hover:border-zinc-700 hover:bg-zinc-900/60 active:scale-[0.98] transition-all cursor-pointer text-center"
              >
                Change Host
              </button>
              <button
                type="button"
                onClick={() => setShowDitchConfirm(true)}
                className="flex-1 py-3 rounded-2xl border border-rose-500/25 bg-rose-500/5 text-rose-500 hover:bg-rose-500/10 text-xs font-mono font-bold uppercase tracking-wider active:scale-[0.98] transition-all cursor-pointer text-center animate-pulse-subtle"
              >
                Ditch Plan
              </button>
            </div>
            {selectedPlan.status === "active" && (
              <button
                type="button"
                onClick={() => {
                  console.log("COMPLETE_BUTTON_CLICKED", {
                    planId: selectedPlan.id,
                    planDbUuid: selectedPlan.dbUuid,
                    planStatus: selectedPlan.status,
                  });
                  handleCompletePlan();
                }}
                disabled={isCompleting}
                className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs font-mono font-bold uppercase tracking-wider active:scale-[0.98] transition-all cursor-pointer text-center shadow-[0_0_12px_rgba(16,185,129,0.2)] disabled:opacity-50"
              >
                {isCompleting ? "Marking complete…" : "Complete Plan"}
              </button>
            )}
          </div>
        ) : (
          <>
            {showJoinDirect && (
              <button
                type="button"
                onClick={handleJoinDirect}
                disabled={isJoiningDirect}
                className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-mono font-bold uppercase tracking-wider active:bg-emerald-600 transition-all duration-200 cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.3)] hover:shadow-[0_0_18px_rgba(16,185,129,0.5)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isJoiningDirect ? "Joining…" : "Join Plan"}
              </button>
            )}
            
            {alreadySkipped ? (
              <button
                type="button"
                onClick={handleRejoin}
                disabled={isRejoining}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#ff5e3a] to-[#ff8b66] text-white text-xs font-mono font-bold uppercase tracking-wider hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_16px_rgba(255,94,58,0.2)]"
              >
                {isRejoining ? "Rejoining…" : "Rejoin Plan"}
              </button>
            ) : isJoinedOrWaitlisted ? (
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(true)}
                className="w-full py-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 text-zinc-500 hover:text-zinc-350 text-xs font-mono font-semibold uppercase tracking-wider hover:border-zinc-700 hover:bg-zinc-900/60 active:scale-[0.98] transition-all cursor-pointer"
              >
                Skip Plan
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSkip}
                disabled={isSkipping}
                className="w-full py-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 text-zinc-500 text-xs font-mono font-semibold uppercase tracking-wider hover:border-zinc-700 hover:text-zinc-300 hover:bg-zinc-900/60 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSkipping ? "Skipping…" : "Skip Plan"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

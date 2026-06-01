import React from "react";
import { ArrowLeft, Share2 } from "lucide-react";
import { Plan, UserProfile } from "../../core/types";
import { usePlansStore } from "../../features/plans/state/PlansContext";

interface DetailedPlanModalProps {
  selectedPlan: Plan;
  onClose: () => void;
  userProfile: UserProfile;
  reminderSentPlanIds: string[];
  passedByPlanId: Record<string, string[]>;
  setReminderSentPlanIds: React.Dispatch<React.SetStateAction<string[]>>;
  setPassedByPlanId: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  triggerToast: (msg: string) => void;
}

export default function DetailedPlanModal({
  selectedPlan,
  onClose,
  userProfile,
  reminderSentPlanIds,
  passedByPlanId,
  setReminderSentPlanIds,
  setPassedByPlanId,
  triggerToast
}: DetailedPlanModalProps) {
  const { getParticipantCounts } = usePlansStore();

  // Use the plan UUID (dbUuid) for DB lookups; fall back to plan.id
  const planUuid = (selectedPlan as any).dbUuid || selectedPlan.id;
  const counts = getParticipantCounts(planUuid);

  // Going = participants with status "going" (excludes the host record)
  const goingCount = counts.going;

  // Pending = delivered + seen (invited but haven't responded yet)
  const pendingCount = counts.pending;

  // Passed = participants who explicitly passed
  const passedCount = counts.passed + (passedByPlanId[selectedPlan.id] || []).length;

  // Progress bar: going / (going + pending + waitlist)
  const activeInvited = goingCount + pendingCount + counts.waitlist;
  const goingPct = activeInvited > 0 ? Math.round((goingCount / activeInvited) * 100) : 0;

  return (
    <div
      id="detailed_plan_modal"
      className="absolute inset-0 bg-black/95 backdrop-blur-md z-45 flex flex-col justify-between animate-fade-in touch-none select-none overflow-hidden"
    >
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
        <button className="text-zinc-500 hover:text-white focus:outline-none">
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
        {/* Host Control Center — shown only to the host */}
        {selectedPlan.creatorName === userProfile.name && (
          <div className="bg-zinc-950 border border-white/[0.04] rounded-[2.2rem] p-5 space-y-4 shadow-[0_4px_24px_rgba(0,0,0,0.8)] text-left animate-fade-in animate-slide-up">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-widest font-black">Host Control Center</h3>
                <h2 className="text-base font-display font-black text-white uppercase tracking-tight leading-none mt-1">
                  {selectedPlan.title}
                </h2>
              </div>

              <button
                type="button"
                disabled={reminderSentPlanIds.includes(selectedPlan.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (reminderSentPlanIds.includes(selectedPlan.id)) return;
                  setReminderSentPlanIds(prev => [...prev, selectedPlan.id]);
                  triggerToast("Reminder sent to pending participants");

                  setTimeout(() => {
                    setPassedByPlanId(prev => ({
                      ...prev,
                      [selectedPlan.id]: [...(prev[selectedPlan.id] || []), "Guhan", "Keerthana"]
                    }));
                    triggerToast("Pending users ignored reminder: Auto-Passed");
                  }, 3500);
                }}
                className={`px-3.5 py-1.5 rounded-full text-[9px] font-mono font-black uppercase tracking-wider transition-all duration-200 border cursor-pointer focus:outline-none ${reminderSentPlanIds.includes(selectedPlan.id)
                  ? "bg-zinc-900 border-zinc-800 text-zinc-500 cursor-not-allowed"
                  : "bg-[#ff8b66]/10 border-[#ff8b66]/30 text-[#ff8b66] hover:bg-[#ff8b66]/20 active:scale-95 shadow-md"}`}
              >
                {reminderSentPlanIds.includes(selectedPlan.id) ? "Reminder Sent ✓" : "⚡ Send Reminder"}
              </button>
            </div>

            {/* DB-accurate participant stats */}
            <div className="grid grid-cols-3 gap-2.5 pt-1 text-center">
              <div className="bg-zinc-900/60 rounded-2xl p-3 border border-white/[0.02]">
                <div className="text-[16px] font-display font-black text-emerald-400">
                  {goingCount}
                </div>
                <div className="text-[8px] font-mono text-zinc-500 uppercase tracking-wider mt-0.5">Going</div>
              </div>

              <div className="bg-zinc-900/60 rounded-2xl p-3 border border-white/[0.02]">
                <div className="text-[16px] font-display font-black text-amber-400">
                  {pendingCount}
                </div>
                <div className="text-[8px] font-mono text-zinc-500 uppercase tracking-wider mt-0.5">Pending</div>
              </div>

              <div className="bg-zinc-900/60 rounded-2xl p-3 border border-white/[0.02]">
                <div className="text-[16px] font-display font-black text-rose-400">
                  {passedCount}
                </div>
                <div className="text-[8px] font-mono text-zinc-500 uppercase tracking-wider mt-0.5">Passed</div>
              </div>
            </div>

            {/* Acceptance progress bar */}
            {activeInvited > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                  <span>Acceptance Rate</span>
                  <span className="text-zinc-400">{goingPct}%</span>
                </div>
                <div className="h-[3px] w-full bg-zinc-900 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700 ease-out"
                    style={{ width: `${goingPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[7.5px] font-mono text-zinc-600">
                  <span>{goingCount} going</span>
                  {counts.waitlist > 0 && <span className="text-amber-500/70">{counts.waitlist} waitlisted</span>}
                  {pendingCount > 0 && <span>{pendingCount} pending</span>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Core details */}
        <div className="bg-zinc-905 border border-zinc-900 rounded-3xl p-5 space-y-4 text-left select-none">
          <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#ff8b66] font-bold">COORDINATED SPECS</span>
          <h2 className="text-xl font-display font-black text-white leading-tight uppercase tracking-tight">{selectedPlan.title}</h2>
          
          <div className="grid grid-cols-1 gap-3 border-t border-b border-zinc-900/50 py-4.5">
            <div className="flex items-center gap-3">
              <span className="text-xs">⏰</span>
              <span className="text-xs text-zinc-200 font-mono font-medium">{selectedPlan.time}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs">📍</span>
              <span className="text-xs text-zinc-350 truncate">{selectedPlan.location}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs">💵</span>
              <span className="text-xs font-mono font-bold text-[#ff8b66]">{selectedPlan.cost > 0 ? `₹${selectedPlan.cost}` : "Free Coordinate"}</span>
            </div>
          </div>

          {selectedPlan.description && (
            <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-3 text-left">
              <p className="text-[11px] text-zinc-400 leading-relaxed italic">"{selectedPlan.description}"</p>
            </div>
          )}

          {/* Participant breakdown for non-hosts */}
          {selectedPlan.creatorName !== userProfile.name && counts.total > 0 && (
            <div className="pt-1 space-y-2">
              <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">Participant Summary</span>
              <div className="flex gap-3">
                <span className="text-[10px] font-mono text-emerald-400">✓ {goingCount} Going</span>
                {counts.waitlist > 0 && <span className="text-[10px] font-mono text-amber-400">⏳ {counts.waitlist} Waitlisted</span>}
                {pendingCount > 0 && <span className="text-[10px] font-mono text-zinc-500">⋯ {pendingCount} Pending</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

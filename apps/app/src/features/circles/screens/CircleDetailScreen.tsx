import React, { useState } from 'react';
import {
  ArrowLeft, Edit, Save, Users, UserPlus, LogOut,
  Shield, MapPin, Compass, Calendar, ChevronRight, Plus
} from "lucide-react";
import { useCirclesStore } from "../state/CirclesContext";
import { useProfileStore } from "../../profile/state/ProfileContext";

/**
 * CircleDetailScreen — unified Circle Info + Settings screen.
 *
 * Replaces the two-step Detail → Settings navigation.
 * Tapping the settings icon from CircleChatScreen lands here directly.
 */
export const CircleDetailScreen = (props: any) => {
  const {
    circle,
    plans,
    activeUserId,
    onBack,                  // back to CircleChatScreen
    onOpenSettings,          // no-op kept for compat – no second settings screen
    setSelectedPlan,
    setPaymentConfirmationPlan,
    handleToggleJoin,
    setActiveStoryRecap,
    // Create plan navigation
    setNewPlanCircleId,
    setNewPlanTitle,
    setSelectedPreset,
    setAudienceType,
    setSelectedCircleIds,
    setActiveTab,
    setCreateFlowStep,
    // Settings mutations
    setCircles,
    setSelectedCircle,
    dbUsers,
    triggerToast,
    onAddMembers,
  } = props;

  const { dbCircles, removeCircleMember, updateCircleMemberRole, transferCircleHost } = useCirclesStore();
  const { activeUserUuid } = useProfileStore();

  const dbCircle = dbCircles.find(c => c.id === circle.dbUuid || c.circle_id === circle.id);
  const isFounder = dbCircle?.created_by === activeUserUuid;
  const activeMemberObj = circle.membersList?.find((m: any) => m.userId === activeUserUuid);
  const isActiveUserHost = activeMemberObj?.role === "host" || isFounder;
  const isActiveUserCoHost = activeMemberObj?.role === "co_host";

  const [userToRemove, setUserToRemove] = useState<{ userId: string; name: string } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const [transferTarget, setTransferTarget] = useState<{ userId: string; name: string } | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);

  // ── editable name state ────────────────────────────────────────────────────
  const [name, setName] = useState(circle.name);
  const [isEditingName, setIsEditingName] = useState(false);

  // ── helpers ────────────────────────────────────────────────────────────────
  const handleSaveName = () => {
    if (!name.trim()) { triggerToast("Circle name cannot be empty!"); return; }
    const updated = { ...circle, name: name.trim() };
    setCircles?.((prev: any[]) => prev.map(c => c.id === circle.id ? updated : c));
    setSelectedCircle?.(updated);
    setIsEditingName(false);
    triggerToast("Circle name updated! ✏️");
  };

  const handleLeaveCircle = () => {
    setCircles?.((prev: any[]) => prev.filter(c => c.id !== circle.id));
    setSelectedCircle?.(null);
    onBack();
    triggerToast(`Left ${circle.name}.`);
  };

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

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current && containerRef.current) {
      console.log("[CircleDetailScreen Logs]");
      console.log("- Viewport height (container clientHeight):", containerRef.current.clientHeight);
      console.log("- Scroll content height (scrollHeight):", scrollRef.current.scrollHeight);
      const isScrollable = scrollRef.current.scrollHeight > scrollRef.current.clientHeight;
      console.log("- Scroll enabled status (content exceeds viewport):", isScrollable);
    }
  }, [circle]);

  return (
    <div
      id="circle_detail_pane"
      ref={containerRef}
      className="flex flex-col h-full animate-fade-in select-none text-left"
    >
      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-3 pb-2 border-b border-zinc-900">
        <button
          type="button"
          onClick={onBack}
          className="text-zinc-500 hover:text-white flex items-center gap-1.5 text-[10.5px] uppercase font-mono font-bold cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Plans
        </button>
        <span className="flex-1" />
        <span className="text-[9.5px] font-mono text-[#ff8b66] font-bold uppercase tracking-widest">
          Circle Hub
        </span>
      </div>

      {/* ── SINGLE PRIMARY SCROLL CONTAINER ───────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar space-y-4 pt-3 pb-8"
      >

      {/* ── 1. CIRCLE INFO & EDITABLE NAME ──────────────────────────────── */}
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-955 border border-zinc-900 rounded-3xl p-5 space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-20 h-20 bg-[#ff8b66]/5 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center gap-3">
          <img
            src={circle.groupImage || circle.avatars?.[0] || "https://images.unsplash.com/photo-1543351611-58f69d7c1781?auto=format&fit=crop&q=80&w=200"}
            className="w-12 h-12 rounded-2xl object-cover border border-zinc-800 shrink-0"
            alt=""
            referrerPolicy="no-referrer"
          />
          <div className="flex-1 min-w-0">
            {isEditingName ? (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="bg-zinc-950 border border-zinc-850 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none flex-1 min-w-0"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  className="p-2 bg-[#ff8b66] text-black hover:bg-[#ff9a7c] rounded-xl flex items-center justify-center shrink-0 cursor-pointer"
                  title="Save name"
                >
                  <Save className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-display font-black text-white tracking-tight truncate">
                  {circle.name}
                </h2>
                <button
                  type="button"
                  onClick={() => setIsEditingName(true)}
                  className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
                  title="Rename circle"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <span className="text-[9.5px] font-mono text-zinc-500 block mt-0.5 uppercase">
              {circle.location} · {circle.membersCount || circle.membersList?.length || 0} members
            </span>
          </div>
        </div>

        {/* Meta rows */}
        <div className="pt-3 border-t border-zinc-950 space-y-2 text-xs">
          {circle.description && (
            <div className="flex justify-between items-start">
              <span className="text-zinc-550 font-mono text-[10px] shrink-0">DESCRIPTION:</span>
              <span className="text-zinc-400 font-sans text-right leading-relaxed pl-4">
                {circle.description}
              </span>
            </div>
          )}
          {circle.location && (
            <div className="flex justify-between items-center">
              <span className="text-zinc-550 font-mono text-[10px]">LOCATION:</span>
              <span className="text-zinc-300 font-semibold flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#ff8b66]" /> {circle.location}
              </span>
            </div>
          )}
          {circle.format && (
            <div className="flex justify-between items-center">
              <span className="text-zinc-550 font-mono text-[10px]">FORMAT:</span>
              <span className="text-zinc-300 font-semibold flex items-center gap-1">
                <Compass className="w-3 h-3 text-[#ff8b66]" /> {circle.format}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. HOST A PLAN ───────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={handleHostPlan}
        className="w-full flex items-center gap-3 bg-zinc-950/80 border border-zinc-900 hover:border-zinc-800 rounded-2xl px-4 py-3 backdrop-blur-md transition-all group cursor-pointer"
      >
        <div className="w-7 h-7 rounded-lg bg-[#ff8b66]/10 border border-[#ff8b66]/20 group-hover:bg-[#ff8b66]/20 transition-colors flex items-center justify-center shrink-0">
          <Plus className="w-4 h-4 text-[#ff8b66]" />
        </div>
        <div className="flex-1 text-left">
          <span className="text-[11px] font-sans font-bold text-zinc-300 group-hover:text-white transition-colors block">
            Host a New Plan
          </span>
          <span className="text-[9px] font-mono text-zinc-600">
            Create a plan for this circle
          </span>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
      </button>

      {/* ── 3. PERMISSIONS ──────────────────────────────────────────────── */}
      <div className="bg-zinc-900/30 border border-zinc-900 rounded-3xl p-5 space-y-3">
        <h3 className="text-[10px] font-display font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#ff8b66]" /> Group Permissions
        </h3>
        <div className="divide-y divide-zinc-950 text-xs">
          <div className="flex justify-between items-center py-2.5">
            <div>
              <h4 className="font-semibold text-zinc-200">Host Authority</h4>
              <p className="text-[9.5px] text-zinc-500">Only hosts can edit details & reassign coordinates</p>
            </div>
            <span className="text-[8.5px] font-mono text-emerald-400 bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-900/30 font-bold uppercase select-none">
              ACTIVE
            </span>
          </div>
          <div className="flex justify-between items-center py-2.5">
            <div>
              <h4 className="font-semibold text-zinc-200">Open Hosting</h4>
              <p className="text-[9.5px] text-zinc-500">Any member can trigger co-pay meets</p>
            </div>
            <span className="text-[8.5px] font-mono text-emerald-400 bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-900/30 font-bold uppercase select-none">
              ENABLED
            </span>
          </div>
        </div>
      </div>

      {/* ── 4. MEMBER DIRECTORY ─────────────────────────────────────────── */}
      <div className="bg-zinc-900/30 border border-zinc-955 rounded-3xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-display font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
            <Users className="w-4 h-4 text-[#ff8b66]" /> Members ({circle.membersList?.length || 0})
          </h3>
          <button
            type="button"
            onClick={onAddMembers}
            className="text-[9px] font-sans font-black uppercase tracking-wider bg-[#ff8b66] hover:bg-[#ff9a7c] text-black px-3 py-1.5 rounded-xl transition-all cursor-pointer"
          >
            Add Members
          </button>
        </div>
        <div className="space-y-2">
          {circle.membersList?.map((m: any, idx: number) => {
            const isTargetHost = m.role === "host";
            const isTargetCoHost = m.role === "co_host";
            const canRemoveThisMember = (isActiveUserHost && !isTargetHost) || (isActiveUserCoHost && m.role === "member");

            return (
              <div
                key={idx}
                className="flex items-center justify-between p-2 bg-zinc-955/60 rounded-xl border border-zinc-900"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src={m.avatar}
                    className="w-6 h-6 rounded-full object-cover shrink-0"
                    alt=""
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <span className="text-[10.5px] font-bold text-zinc-250 truncate block leading-tight">{m.name}</span>
                    <span className="text-[8.5px] font-mono text-zinc-550 block">{m.phone}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[7.5px] font-mono uppercase bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-550 select-none font-bold">
                    {isTargetHost ? "Host" : isTargetCoHost ? "Co-host" : "Member"}
                  </span>
                  {isActiveUserHost && !isTargetHost && (
                    <button
                      type="button"
                      onClick={() => setTransferTarget({ userId: m.userId, name: m.name })}
                      className="px-2 py-0.5 rounded border border-[#ff8b66]/20 bg-[#ff8b66]/5 hover:bg-[#ff8b66]/10 active:scale-[0.97] transition-all text-[#ff8b66] text-[8.5px] font-mono font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Transfer Host
                    </button>
                  )}
                  {isActiveUserHost && !isTargetHost && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const newRole = isTargetCoHost ? "member" : "co_host";
                          const targetCircleUuid = circle.dbUuid || dbCircle?.id || circle.id;
                          await updateCircleMemberRole(targetCircleUuid, m.userId, newRole);
                          triggerToast(isTargetCoHost ? `Demoted ${m.name} to Member` : `Promoted ${m.name} to Co-host`);
                        } catch (err: any) {
                          triggerToast(`Error: ${err.message || err}`);
                        }
                      }}
                      className="px-2 py-0.5 rounded border border-[#ff8b66]/20 bg-[#ff8b66]/5 hover:bg-[#ff8b66]/10 active:scale-[0.97] transition-all text-[#ff8b66] text-[8.5px] font-mono font-bold uppercase tracking-wider cursor-pointer"
                    >
                      {isTargetCoHost ? "Remove Co-host" : "Make Co-host"}
                    </button>
                  )}
                  {canRemoveThisMember && (
                    <button
                      type="button"
                      onClick={() => setUserToRemove({ userId: m.userId, name: m.name })}
                      className="px-2 py-0.5 rounded border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 active:scale-[0.97] transition-all text-rose-500 text-[8.5px] font-mono font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 6. LEAVE CIRCLE ─────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={handleLeaveCircle}
        className="w-full bg-[#ff5d41]/5 hover:bg-[#ff5d41]/10 border border-[#ff5d41]/20 rounded-2xl p-4 flex items-center justify-between transition-colors text-left text-[#ff5d41] cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#ff5d41]/10 flex items-center justify-center shrink-0">
            <LogOut className="w-4 h-4 text-[#ff5d41]" />
          </div>
          <div>
            <h4 className="text-xs font-semibold">Leave Circle</h4>
            <span className="text-[9.5px] font-mono text-[#ff8b66]/60 uppercase block mt-0.5">
              Remove yourself from this circle
            </span>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#ff5d41]">
          Leave
        </span>
      </button>

      </div>

      {/* Transfer Host Confirmation Dialog */}
      {transferTarget && (
        <div className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center p-6 z-55 animate-fade-in text-center">
          <div className="bg-[#0C0C0E]/90 backdrop-blur-md border border-zinc-900 rounded-3xl p-6 w-full max-w-xs text-center space-y-4 shadow-2xl">
            <h3 className="text-base font-display font-black text-white uppercase tracking-wider">
              Transfer Circle Host?
            </h3>
            <div className="space-y-2 text-center font-sans text-[11px] text-zinc-400">
              <p>
                <span className="text-zinc-200 font-semibold">{transferTarget.name}</span> will become the new Host.
              </p>
              <p className="text-[#ff8b66] font-semibold">
                You will become a Co-host.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTransferTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950/60 text-zinc-400 text-[10px] font-mono font-bold uppercase tracking-wider hover:bg-zinc-900 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    setIsTransferring(true);
                    const targetCircleUuid = circle.dbUuid || dbCircle?.id || circle.id;
                    await transferCircleHost(targetCircleUuid, transferTarget.userId);
                    triggerToast(`✓ Transferred Circle Host to ${transferTarget.name}`);
                    
                    // Update the local membersList and host/co_host roles
                    circle.membersList = circle.membersList.map((m: any) => {
                      if (m.userId === transferTarget.userId) {
                        return { ...m, role: "host" };
                      }
                      if (m.userId === activeUserUuid) {
                        return { ...m, role: "co_host" };
                      }
                      return m;
                    });
                    setSelectedCircle?.({ ...circle });

                    setTransferTarget(null);
                  } catch (err: any) {
                    triggerToast(`Error: ${err.message || err}`);
                  } finally {
                    setIsTransferring(false);
                  }
                }}
                disabled={isTransferring}
                className="flex-1 py-2.5 rounded-xl bg-[#ff8b66] hover:bg-[#ff9a7c] text-black text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40"
              >
                {isTransferring ? "Transferring…" : "Transfer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Member Confirmation Dialog */}
      {userToRemove && (
        <div className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center p-6 z-55 animate-fade-in text-center">
          <div className="bg-[#0C0C0E]/90 backdrop-blur-md border border-zinc-900 rounded-3xl p-6 w-full max-w-xs text-center space-y-4 shadow-2xl">
            <h3 className="text-base font-display font-black text-white uppercase tracking-wider">
              Remove Member?
            </h3>
            <div className="space-y-2 text-left font-sans text-[11px] text-zinc-400">
              <p className="text-center">
                <span className="text-zinc-200 font-semibold">{userToRemove.name}</span> will:
              </p>
              <ul className="space-y-1 list-disc pl-5">
                <li>Leave this circle</li>
                <li>Lose access to circle chat</li>
                <li>Stop receiving future plans from this circle</li>
              </ul>
              <p className="text-center text-[10px] text-zinc-500 pt-1">
                Past memories will remain.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUserToRemove(null)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950/60 text-zinc-400 text-[10px] font-mono font-bold uppercase tracking-wider hover:bg-zinc-900 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    setIsRemoving(true);
                    const targetCircleUuid = circle.dbUuid || dbCircle?.id || circle.id;
                    await removeCircleMember(targetCircleUuid, userToRemove.userId);
                    triggerToast(`✓ Removed ${userToRemove.name} from circle`);
                    
                    // Update the local membersList of the active settings circle
                    circle.membersList = circle.membersList.filter((m: any) => m.userId !== userToRemove.userId);
                    circle.membersCount = circle.membersList.length;
                    circle.avatars = circle.membersList.slice(0, 5).map((m: any) => m.avatar);
                    setSelectedCircle?.({ ...circle });

                    setUserToRemove(null);
                  } catch (err: any) {
                    triggerToast(`Error: ${err.message || err}`);
                  } finally {
                    setIsRemoving(false);
                  }
                }}
                disabled={isRemoving}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40"
              >
                {isRemoving ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


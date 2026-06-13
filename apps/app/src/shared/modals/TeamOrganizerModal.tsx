import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Users } from "lucide-react";
import { Plan, UserProfile } from "../../core/types";
import { usePlansStore } from "../../features/plans/state/PlansContext";
import { useCirclesStore } from "../../features/circles/state/CirclesContext";
import { DbPlanTeamAssignment } from "../../lib/db";

interface TeamOrganizerModalProps {
  plan: Plan;
  userProfile: UserProfile;
  activeUserId?: string;
  onClose: () => void;
  triggerToast: (msg: string) => void;
}

export default function TeamOrganizerModal({
  plan,
  userProfile,
  activeUserId,
  onClose,
  triggerToast,
}: TeamOrganizerModalProps) {
  const { dbPlanTeamAssignments, getTeamAssignments, assignTeam, unassignTeam, removeParticipant } =
    usePlansStore();

  const { dbCircles, dbCircleMembers } = useCirclesStore();

  const planUuid = (plan as any).dbUuid || plan.id;

  // Load assignments on mount
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getTeamAssignments(planUuid).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planUuid]);

  // All going participants (includes host)
  const goingMembers = useMemo(
    () => plan.members.filter((m) => m.joinState === "going"),
    [plan.members]
  );

  // All waitlisted participants
  const waitlistMembers = useMemo(
    () => plan.members.filter((m) => m.joinState === "waitlist"),
    [plan.members]
  );

  // Per-plan assignments from context
  const planAssignments = useMemo(
    () => dbPlanTeamAssignments.filter((a) => a.plan_id === planUuid),
    [dbPlanTeamAssignments, planUuid]
  );

  const resolvedUserUuid = userProfile.dbUuid || activeUserId;
  const isHost = plan.hostId === resolvedUserUuid || plan.creatorId === resolvedUserUuid;
  const isModerator = isHost;

  console.log("MODERATOR DEBUG", {
    hostId: plan.hostId,
    creatorId: plan.creatorId,
    activeUserId,
    dbUuid: userProfile.dbUuid,
    isHost,
    isModerator,
  });

  const canRemoveParticipant = (targetUserId: string) => {
    if (!isModerator) return false;
    const res = (() => {
      const isPlanHost =
        targetUserId === plan.creatorId ||
        targetUserId === plan.hostId;
      return !isPlanHost;
    })();

    console.log("TEAM ORGANIZER DEBUG", {
      isModerator,
      canRemove: res,
      currentUserId: activeUserId || userProfile.dbUuid,
      participantId: targetUserId,
    });

    return res;
  };

  const [userToRemove, setUserToRemove] = useState<{ userId: string; name: string } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const getAssignment = (userId: string): DbPlanTeamAssignment | undefined =>
    planAssignments.find(
      (a) => a.user_id === userId
    );

  const teamA = goingMembers.filter((m) => {
    const a = getAssignment(m.userUuid || m.userId);
    return a?.team === "A";
  });
  const teamB = goingMembers.filter((m) => {
    const a = getAssignment(m.userUuid || m.userId);
    return a?.team === "B";
  });
  const unassigned = goingMembers.filter((m) => {
    const a = getAssignment(m.userUuid || m.userId);
    return !a;
  });

  // In-progress assignment tracking for per-button loading states
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const handleAssign = async (userId: string, userUuid: string, team: "A" | "B") => {
    if (pending[userUuid]) return;
    setPending((p) => ({ ...p, [userUuid]: true }));
    try {
      await assignTeam(planUuid, userUuid, team);
    } catch {
      triggerToast("Failed to assign player");
    } finally {
      setPending((p) => ({ ...p, [userUuid]: false }));
    }
  };

  const handleUnassign = async (userId: string, userUuid: string) => {
    if (pending[userUuid]) return;
    setPending((p) => ({ ...p, [userUuid]: true }));
    try {
      await unassignTeam(planUuid, userUuid);
    } catch {
      triggerToast("Failed to unassign player");
    } finally {
      setPending((p) => ({ ...p, [userUuid]: false }));
    }
  };

  return (
    <div
      id="team_organizer_modal"
      className="absolute inset-0 bg-[#0C0C0E]/98 backdrop-blur-md z-50 flex flex-col animate-fade-in"
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-zinc-900 shrink-0">
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-white flex items-center gap-1.5 text-xs focus:outline-none transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="text-center">
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#ff8b66]">
            Team Organizer
          </span>
          <div className="text-[9px] font-mono text-zinc-500 mt-0.5">{plan.title}</div>
        </div>
        <div className="w-14" />
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-xs font-mono text-zinc-500 animate-pulse">Loading teams…</div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-5">
          {/* Score banner */}
          <div className="flex gap-3">
            <TeamBadge label="Team A" count={teamA.length} color="emerald" />
            <div className="flex flex-col items-center justify-center px-2">
              <span className="text-lg font-display font-black text-zinc-600">VS</span>
            </div>
            <TeamBadge label="Team B" count={teamB.length} color="sky" />
          </div>

          {/* Team A */}
          <Section title="Team A" accentClass="text-emerald-400" borderClass="border-emerald-500/20" bgClass="bg-emerald-500/5">
            {teamA.length === 0 ? (
              <EmptySlot label="No players assigned to Team A yet" />
            ) : (
              teamA.map((m) => (
                <PlayerRow
                  key={m.userId}
                  member={m}
                  currentTeam="A"
                  loading={!!pending[m.userUuid || m.userId]}
                  onMoveToA={() => {}} // already on A
                  onMoveToB={() => handleAssign(m.userId, m.userUuid || m.userId, "B")}
                  onUnassign={() => handleUnassign(m.userId, m.userUuid || m.userId)}
                  canRemove={canRemoveParticipant(m.userId)}
                  onRemove={() => setUserToRemove({ userId: m.userId, name: m.name })}
                />
              ))
            )}
          </Section>

          {/* Team B */}
          <Section title="Team B" accentClass="text-sky-400" borderClass="border-sky-500/20" bgClass="bg-sky-500/5">
            {teamB.length === 0 ? (
              <EmptySlot label="No players assigned to Team B yet" />
            ) : (
              teamB.map((m) => (
                <PlayerRow
                  key={m.userId}
                  member={m}
                  currentTeam="B"
                  loading={!!pending[m.userUuid || m.userId]}
                  onMoveToA={() => handleAssign(m.userId, m.userUuid || m.userId, "A")}
                  onMoveToB={() => {}} // already on B
                  onUnassign={() => handleUnassign(m.userId, m.userUuid || m.userId)}
                  canRemove={canRemoveParticipant(m.userId)}
                  onRemove={() => setUserToRemove({ userId: m.userId, name: m.name })}
                />
              ))
            )}
          </Section>

          {/* Unassigned */}
          <Section title="Unassigned" accentClass="text-zinc-400" borderClass="border-zinc-800/40" bgClass="bg-zinc-900/20">
            {unassigned.length === 0 ? (
              <EmptySlot label="All players have been assigned" />
            ) : (
              unassigned.map((m) => (
                <PlayerRow
                  key={m.userId}
                  member={m}
                  currentTeam={null}
                  loading={!!pending[m.userUuid || m.userId]}
                  onMoveToA={() => handleAssign(m.userId, m.userUuid || m.userId, "A")}
                  onMoveToB={() => handleAssign(m.userId, m.userUuid || m.userId, "B")}
                  onUnassign={() => {}}
                  canRemove={canRemoveParticipant(m.userId)}
                  onRemove={() => setUserToRemove({ userId: m.userId, name: m.name })}
                />
              ))
            )}
          </Section>

          {/* Waitlist */}
          <Section title="Waitlist" accentClass="text-amber-500" borderClass="border-amber-500/20" bgClass="bg-amber-500/5">
            {waitlistMembers.length === 0 ? (
              <EmptySlot label="No waitlisted users" />
            ) : (
              waitlistMembers.map((m) => (
                <PlayerRow
                  key={m.userId}
                  member={m}
                  currentTeam={null}
                  loading={!!pending[m.userUuid || m.userId]}
                  onMoveToA={() => {}}
                  onMoveToB={() => {}}
                  onUnassign={() => {}}
                  canRemove={canRemoveParticipant(m.userId)}
                  onRemove={() => setUserToRemove({ userId: m.userId, name: m.name })}
                />
              ))
            )}
          </Section>
        </div>
      )}

      {/* Footer summary */}
      <div className="shrink-0 px-4 py-3 border-t border-zinc-900">
        <div className="flex items-center justify-between text-[9px] font-mono text-zinc-600 uppercase tracking-wider">
          <span>Total: {goingMembers.length + waitlistMembers.length} players ({goingMembers.length} Going · {waitlistMembers.length} Waitlist)</span>
          <span>
            A: {teamA.length} · B: {teamB.length} · Unassigned: {unassigned.length}
          </span>
        </div>
      </div>

      {/* Participant Removal Confirmation Dialog */}
      {userToRemove && (() => {
        const userToRemoveMember = plan.members.find(m => m.userId === userToRemove.userId);
        const userToRemoveUuid = userToRemoveMember?.userUuid || userToRemove.userId;
        const userToRemoveAssignment = planAssignments.find(pa => pa.user_id === userToRemoveUuid);
        const assignedTeam = userToRemoveAssignment?.team;

        return (
          <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-6 z-55 animate-fade-in text-center">
            <div className="bg-[#0C0C0E]/90 backdrop-blur-md border border-zinc-900 rounded-3xl p-6 w-full max-w-xs text-center space-y-4 shadow-2xl">
              <h3 className="text-base font-display font-black text-white uppercase tracking-wider">
                Remove Participant?
              </h3>
              
              {assignedTeam ? (
                <div className="space-y-3 text-left font-sans text-[11px] text-zinc-400">
                  <p className="text-center">
                    <span className="text-zinc-200 font-semibold">{userToRemove.name}</span> is currently assigned to Team {assignedTeam}.
                  </p>
                  <p className="font-semibold text-zinc-350">Removing this participant will:</p>
                  <ul className="space-y-1 list-disc pl-5">
                    <li>Remove them from Team {assignedTeam}</li>
                    <li>Remove them from the plan</li>
                  </ul>
                </div>
              ) : (
                <div className="space-y-3 text-left font-sans text-[11px] text-zinc-400">
                  <p className="text-center">
                    <span className="text-zinc-200 font-semibold">{userToRemove.name}</span> is currently unassigned.
                  </p>
                  <p className="font-semibold text-zinc-355">Removing this participant will:</p>
                  <ul className="space-y-1 list-disc pl-5">
                    <li>Remove them from the plan</li>
                    <li>Free their participant slot</li>
                  </ul>
                </div>
              )}

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
                      await removeParticipant(plan.id, userToRemove.userId);
                      triggerToast(`✓ Removed ${userToRemove.name} from plan`);
                      setUserToRemove(null);
                    } catch (err: any) {
                      triggerToast(`Error removing: ${err.message || err}`);
                    } finally {
                      setIsRemoving(false);
                    }
                  }}
                  disabled={isRemoving}
                  className="flex-1 py-2.5 rounded-xl bg-rose-650 hover:bg-rose-600 text-white text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40"
                >
                  {isRemoving ? "Removing…" : "Remove"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function TeamBadge({ label, count, color }: { label: string; count: number; color: "emerald" | "sky" }) {
  const colorMap = {
    emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400",
    sky: "from-sky-500/20 to-sky-500/5 border-sky-500/30 text-sky-400",
  };
  return (
    <div
      className={`flex-1 rounded-2xl border bg-gradient-to-b ${colorMap[color]} flex flex-col items-center justify-center py-4 gap-1`}
    >
      <span className={`text-2xl font-display font-black ${colorMap[color].split(" ").pop()}`}>{count}</span>
      <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-zinc-500">{label}</span>
    </div>
  );
}

function Section({
  title,
  accentClass,
  borderClass,
  bgClass,
  children,
}: {
  title: string;
  accentClass: string;
  borderClass: string;
  bgClass: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border ${borderClass} ${bgClass} p-3 space-y-2`}>
      <div className={`text-[9px] font-mono font-bold uppercase tracking-[0.2em] ${accentClass}`}>
        {title}
      </div>
      {children}
    </div>
  );
}

function EmptySlot({ label }: { label: string }) {
  return (
    <div className="py-3 text-center text-[10px] font-mono text-zinc-650 border border-dashed border-zinc-900 rounded-xl">
      {label}
    </div>
  );
}

interface PlayerRowProps {
  key?: React.Key;
  member: { userId: string; userUuid?: string; name: string; avatar: string };
  currentTeam: "A" | "B" | null;
  loading: boolean;
  onMoveToA: () => void;
  onMoveToB: () => void;
  onUnassign: () => void;
  canRemove: boolean;
  onRemove: () => void;
  isWaitlist?: boolean;
}

function PlayerRow({ member, currentTeam, loading, onMoveToA, onMoveToB, onUnassign, canRemove, onRemove, isWaitlist }: PlayerRowProps) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-900/60 font-sans">
      <div className="flex items-center gap-2.5">
        <img
          src={member.avatar}
          alt={member.name}
          className="w-7 h-7 rounded-full object-cover border border-zinc-800"
          referrerPolicy="no-referrer"
        />
        <span className="text-xs font-semibold text-zinc-200 truncate max-w-[110px]">{member.name}</span>
      </div>

      {loading ? (
        <span className="text-[9px] font-mono text-zinc-500 animate-pulse">Moving…</span>
      ) : (
        <div className="flex items-center gap-1.5 animate-fade-in shrink-0">
          {!isWaitlist && currentTeam !== "A" && (
            <button
              onClick={onMoveToA}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-mono font-bold uppercase tracking-wider hover:bg-emerald-500/20 active:scale-95 transition-all cursor-pointer"
            >
              → A
            </button>
          )}
          {!isWaitlist && currentTeam !== "B" && (
            <button
              onClick={onMoveToB}
              className="px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[9px] font-mono font-bold uppercase tracking-wider hover:bg-sky-500/20 active:scale-95 transition-all cursor-pointer"
            >
              → B
            </button>
          )}
          {!isWaitlist && currentTeam !== null && (
            <button
              onClick={onUnassign}
              className="px-2.5 py-1 rounded-lg bg-zinc-900/60 border border-zinc-800 text-zinc-550 text-[9px] font-mono font-bold hover:text-zinc-350 hover:bg-zinc-800/60 active:scale-95 transition-all cursor-pointer"
            >
              Unassign
            </button>
          )}
          {canRemove && (
            <button
              onClick={onRemove}
              className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[9px] font-mono font-bold uppercase tracking-wider hover:bg-rose-500/20 active:scale-95 transition-all cursor-pointer"
            >
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  );
}

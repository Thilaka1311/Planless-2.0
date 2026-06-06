import React from "react";
import { ArrowLeft, Search, ChevronRight } from "lucide-react";
import { CreatePlanCTAButton } from "./CreatePlanCTAButton";

import { PlanSummary } from "./PlanSummary";
import { AttendanceSummaryCard } from "./AttendanceSummaryCard";
import { useProfileStore } from "../../../profile/state/ProfileContext";

interface CircleItem {
  id: string;
  name: string;
  groupImage?: string;
  avatars: string[];
  membersCount: number;
  membersList?: { userId: string }[];
}

interface DbUserItem {
  id: string;
  user_id: string;
  full_name: string;
  username: string;
  phone_number?: string;
}

interface InviteRecipientsStepProps {
  audienceType: "circle" | "friends" | "multiple";
  setAudienceType: (type: "circle" | "friends" | "multiple") => void;
  recipientSearchQuery: string;
  setRecipientSearchQuery: (val: string) => void;
  selectedCircleIds: string[];
  setSelectedCircleIds: React.Dispatch<React.SetStateAction<string[]>>;
  selectedFriendIds: string[];
  setSelectedFriendIds: React.Dispatch<React.SetStateAction<string[]>>;
  circles: CircleItem[];
  dbUsers: DbUserItem[];
  activeUserId: string | null;
  setCreateFlowStep: (step: any) => void;
  triggerToast: (msg: string) => void;
  dbUserData?: any[];
  waitlistEnabled: boolean;
  setWaitlistEnabled: (val: boolean) => void;
  joinLimit: number;
  setJoinLimit: (val: number) => void;
  onBack?: () => void;
  onNext?: () => void;
  hideWaitlist?: boolean;
  summary?: {
    title: string;
    location?: string;
    time?: string;
    invitedCount: number;
    cost: string;
    waitlistEnabled?: boolean;
    joinLimit?: number;
  };
}

export const InviteRecipientsStep = ({
  audienceType,
  setAudienceType,
  recipientSearchQuery,
  setRecipientSearchQuery,
  selectedCircleIds,
  setSelectedCircleIds,
  selectedFriendIds,
  setSelectedFriendIds,
  circles,
  dbUsers,
  activeUserId,
  setCreateFlowStep,
  triggerToast,
  dbUserData = [],
  waitlistEnabled,
  setWaitlistEnabled,
  joinLimit,
  setJoinLimit,
  onBack,
  onNext,
  hideWaitlist = false,
  summary,
}: InviteRecipientsStepProps) => {
  const { dbFriendships, userProfile } = useProfileStore();
  const myUuid = userProfile?.dbUuid || userProfile?.id || "";

  const invitedGuestsCount = React.useMemo(() => {
    const set = new Set<string>();

    selectedCircleIds.forEach((cid) => {
      const c = circles.find((x) => x.id === cid);
      if (c) {
        if (c.membersList) {
          c.membersList.forEach((m) => {
            if (m.userId && m.userId !== activeUserId) {
              set.add(m.userId);
            }
          });
        } else {
          const countWithoutHost = Math.max(0, c.membersCount - 1);
          for (let i = 0; i < countWithoutHost; i++) {
            set.add(`fallback_member_${cid}_${i}`);
          }
        }
      }
    });

    selectedFriendIds.forEach((fid) => {
      if (fid !== activeUserId) {
        set.add(fid);
      }
    });

    return set.size;
  }, [selectedCircleIds, selectedFriendIds, circles, activeUserId]);

  const selectedCount = invitedGuestsCount;

  React.useEffect(() => {
    // joinLimit = total going capacity including host
    // Maximum valid value = selectedCount + 1 (all invitees + host)
    if (waitlistEnabled && joinLimit > invitedGuestsCount + 1) {
      setJoinLimit(invitedGuestsCount > 0 ? invitedGuestsCount + 1 : 2);
    }
  }, [invitedGuestsCount, waitlistEnabled, joinLimit, setJoinLimit]);

  // Compute set of user IDs belonging to selected circles
  const selectedCircleMemberUserIds = React.useMemo(() => {
    const set = new Set<string>();
    selectedCircleIds.forEach((cid) => {
      const c = circles.find((x) => x.id === cid);
      if (c && c.membersList) {
        c.membersList.forEach((m) => {
          if (m.userId) set.add(m.userId);
        });
      }
    });
    return set;
  }, [selectedCircleIds, circles]);

  // deselect selected friends that are already covered by selected circles
  React.useEffect(() => {
    if (selectedCircleMemberUserIds.size > 0) {
      setSelectedFriendIds((prev) => prev.filter((fid) => !selectedCircleMemberUserIds.has(fid)));
    }
  }, [selectedCircleMemberUserIds, setSelectedFriendIds]);

  const filteredCircles = circles.filter(circle =>
    circle.name.toLowerCase().includes(recipientSearchQuery.toLowerCase())
  );

  const filteredFriends = dbUsers.filter(user => {
    if (user.user_id === activeUserId) return false;
    // Hide friend if they are in a selected group
    if (selectedCircleMemberUserIds.has(user.user_id)) return false;

    // Filter to only display active friends (bidirectional symmetric lookup)
    const targetUserUuid = user.id;
    if (!targetUserUuid || !myUuid) return false;
    const sender = myUuid < targetUserUuid ? myUuid : targetUserUuid;
    const receiver = myUuid < targetUserUuid ? targetUserUuid : myUuid;
    const isFriend = dbFriendships.some(f => f.sender_id === sender && f.receiver_id === receiver);
    if (!isFriend) return false;

    if (!recipientSearchQuery) return true;
    const q = recipientSearchQuery.toLowerCase();
    return (
      user.full_name.toLowerCase().includes(q) ||
      user.username.toLowerCase().includes(q) ||
      (user.phone_number || "").replace(/[^0-9]/g, "").includes(q.replace(/[^0-9]/g, ""))
    );
  });

  return (
    <div className="animate-fade-in text-left flex flex-col h-[570px] relative">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-[140px] space-y-3">
        <button
          type="button"
          onClick={onBack || (() => setCreateFlowStep("DETAILS"))}
          className="text-xs font-mono font-medium text-zinc-550 hover:text-zinc-200 flex items-center gap-1.5 cursor-pointer py-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to core info</span>
        </button>

        {summary && (
          <PlanSummary
            title={summary.title}
            location={summary.location}
            time={summary.time}
            invitedCount={summary.invitedCount}
            cost={summary.cost}
            waitlistEnabled={summary.waitlistEnabled}
            joinLimit={summary.joinLimit}
          />
        )}

        <div className="space-y-0.5">
          <h3 className="text-sm font-display font-semibold text-zinc-200">Who's invited?</h3>
          <p className="text-[11px] text-zinc-550 font-sans">Pick groups or individual friends.</p>
        </div>

        <div className="relative">
          <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="w-3.5 h-3.5 text-zinc-650" />
          </span>
          <input
            type="text"
            placeholder="Search groups or friends..."
            value={recipientSearchQuery}
            onChange={(e) => setRecipientSearchQuery(e.target.value)}
            className="w-full bg-zinc-905 border border-zinc-855 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-650 focus:outline-none"
          />
        </div>

        <div className="bg-zinc-905/60 border border-zinc-900 rounded-3xl p-3 space-y-4">
          {filteredCircles.length === 0 && filteredFriends.length === 0 && (
            <p className="text-[11px] text-zinc-550 text-center py-4 font-mono">No matching groups or friends found.</p>
          )}

          {/* BUDDY GROUPS SECTION */}
          {filteredCircles.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[9px] font-mono font-bold text-brand-peach/85 tracking-wider uppercase mb-1 px-1">Groups</h4>
              {filteredCircles.map((circle) => {
                const isSelected = selectedCircleIds.includes(circle.id);
                return (
                  <div
                    key={circle.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedCircleIds(prev => prev.filter(id => id !== circle.id));
                      } else {
                        setSelectedCircleIds(prev => [...prev, circle.id]);
                      }
                    }}
                    className={`p-2 rounded-2xl flex items-center justify-between cursor-pointer border transition-all ${isSelected
                      ? "bg-[#ff8b66]/10 border-[#ff8b66]/30"
                      : "bg-zinc-950/40 border-zinc-900 hover:border-zinc-855"
                      }`}
                  >
                    <div className="flex items-center gap-2.5 text-left min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0">
                        <img
                          src={circle.groupImage || circle.avatars[0]}
                          className="w-full h-full object-cover"
                          alt=""
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs text-zinc-200 block font-semibold leading-none truncate">{circle.name}</span>
                        <span className="text-[8px] text-zinc-500 font-mono mt-1 block uppercase leading-none">{circle.membersCount} members</span>
                      </div>
                    </div>
                    {isSelected ? (
                      <div className="w-4 h-4 rounded-full bg-[#ff5e3a] flex items-center justify-center shrink-0 shadow-sm animate-scale-in">
                        <svg viewBox="0 0 10 10" fill="none" className="w-2.5 h-2.5">
                          <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-zinc-700 hover:border-zinc-500 shrink-0 transition-colors" />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* FRIENDS SECTION */}
          {filteredFriends.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[9px] font-mono font-bold text-brand-peach/85 tracking-wider uppercase mb-1 px-1">Friends</h4>
              {filteredFriends.map((user) => {
                const isSelected = selectedFriendIds.includes(user.user_id);
                return (
                  <div
                    key={user.user_id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedFriendIds(prev => prev.filter(id => id !== user.user_id));
                      } else {
                        setSelectedFriendIds(prev => [...prev, user.user_id]);
                      }
                    }}
                    className={`p-2 rounded-2xl flex items-center justify-between cursor-pointer border transition-all ${isSelected
                      ? "bg-[#ff8b66]/10 border-[#ff8b66]/30"
                      : "bg-zinc-950/40 border-zinc-900 hover:border-zinc-855"
                      }`}
                  >
                    <div className="flex items-center gap-2.5 text-left min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-[10px] font-mono text-zinc-300 shrink-0">
                        {user.full_name[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs text-zinc-200 block font-semibold leading-none truncate">{user.full_name}</span>
                        <span className="text-[8px] text-zinc-500 font-mono mt-1 block leading-none">@{user.username}</span>
                      </div>
                    </div>
                    {isSelected ? (
                      <div className="w-4 h-4 rounded-full bg-[#ff5e3a] flex items-center justify-center shrink-0 shadow-sm animate-scale-in">
                        <svg viewBox="0 0 10 10" fill="none" className="w-2.5 h-2.5">
                          <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-zinc-700 hover:border-zinc-500 shrink-0 transition-colors" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center bg-zinc-950/60 border border-zinc-900 rounded-2xl p-2.5 text-xs shrink-0">
          <span className="text-zinc-400 font-sans">Selected Participants</span>
          <span className="text-brand-peach font-mono font-bold text-sm">{selectedCount}</span>
        </div>

        {/* Enable Waitlist Toggle (Hidden if hideWaitlist is true) */}
        {!hideWaitlist && (
          <>
            <div className="flex justify-between items-center bg-zinc-950/60 border border-zinc-900 rounded-2xl p-3 text-xs shrink-0">
              <span className="text-zinc-400 font-sans">Enable Waitlist</span>
              <input
                type="checkbox"
                checked={waitlistEnabled}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  setWaitlistEnabled(enabled);
                  if (enabled && joinLimit > selectedCount + 1) {
                    setJoinLimit(selectedCount > 0 ? selectedCount + 1 : 2);
                  }
                }}
                className="accent-[#ff8b66] w-4.5 h-4.5 cursor-pointer"
              />
            </div>

            {/* Join Limit Slider (conditional) */}
            {waitlistEnabled && (
              <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-3 space-y-3.5 text-left shrink-0">
                {/* Slider header */}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400 font-sans">Going Capacity</span>
                  <span className="text-[#ff8b66] font-mono font-bold text-sm leading-none">{joinLimit}</span>
                </div>
                <div className="space-y-0.5">
                  <input
                    type="range"
                    min={2}
                    max={selectedCount > 0 ? selectedCount + 1 : 2}
                    value={joinLimit}
                    onChange={(e) => setJoinLimit(Number(e.target.value))}
                    className="w-full accent-[#ff8b66] cursor-pointer h-1.5"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-zinc-600 leading-none">
                    <span>2 (host only)</span>
                    <span>{selectedCount + 1} (all)</span>
                  </div>
                </div>

                {/* Attendance Summary Component */}
                <AttendanceSummaryCard
                  invitedParticipants={selectedCount}
                  waitlistEnabled={waitlistEnabled}
                  joinLimit={joinLimit}
                />

                {/* Helper text */}
                <p className="text-[10px] text-zinc-550 font-sans text-center leading-relaxed pt-0.5">
                  Host is automatically included in Going Capacity.
                </p>
              </div>
            )}

          </>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent pt-6 pb-2 shrink-0 z-10">
        <CreatePlanCTAButton
          text="INVITE PEOPLE"
          onPress={() => {
            if (selectedCircleIds.length === 0 && selectedFriendIds.length === 0) {
              triggerToast("Please pick at least one recipient (group or friend) first before proceeding.");
              return;
            }
            if (onNext) {
              onNext();
            } else {
              setCreateFlowStep("EXTRA");
            }
          }}
        />
      </div>
    </div>
  );
};

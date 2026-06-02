import React from "react";
import { ArrowLeft, Search, ChevronRight } from "lucide-react";
import { CreatePlanCTAButton } from "./CreatePlanCTAButton";

interface CircleItem {
  id: string;
  name: string;
  groupImage?: string;
  avatars: string[];
  membersCount: number;
}

interface DbUserItem {
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
}: InviteRecipientsStepProps) => {
  const getSelectedParticipantsCount = () => {
    if (audienceType === "friends") {
      return selectedFriendIds.length;
    }
    // Sum membersCount of all selected circles
    return selectedCircleIds.reduce((sum, cid) => {
      const c = circles.find(x => x.id === cid);
      return sum + (c ? c.membersCount : 0);
    }, 0);
  };

  const selectedCount = getSelectedParticipantsCount();

  React.useEffect(() => {
    if (waitlistEnabled && joinLimit > selectedCount) {
      setJoinLimit(selectedCount > 0 ? selectedCount : 1);
    }
  }, [selectedCount, waitlistEnabled, joinLimit, setJoinLimit]);

  return (
    <div className="space-y-5 animate-fade-in text-left">
      <button
        type="button"
        onClick={onBack || (() => setCreateFlowStep("DETAILS"))}
        className="text-xs font-mono font-medium text-zinc-550 hover:text-zinc-200 flex items-center gap-1.5 cursor-pointer py-1"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to core info</span>
      </button>

      <div className="space-y-1">
        <h3 className="text-sm font-display font-semibold text-zinc-200">Who's invited?</h3>
        <p className="text-[11px] text-zinc-550 font-sans">Pick circles or individual friends.</p>
      </div>

      <div className="grid grid-cols-3 gap-1 bg-zinc-905 p-1 rounded-xl">
        {[
          { key: "circle" as const, label: "Circle" },
          { key: "friends" as const, label: "Friends" },
          { key: "multiple" as const, label: "Multi Group" }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setAudienceType(tab.key);
              setRecipientSearchQuery("");
            }}
            className={`py-1.5 text-[10px] font-mono rounded-lg transition-all border cursor-pointer ${audienceType === tab.key
              ? "bg-zinc-950 text-white border-zinc-850 shadow-md font-semibold"
              : "text-zinc-550 hover:text-zinc-355 border-transparent"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <Search className="w-3.5 h-3.5 text-zinc-650" />
        </span>
        <input
          type="text"
          placeholder={
            audienceType === "friends"
              ? "Search by username or mobile..."
              : "Search intimate buddy groups..."
          }
          value={recipientSearchQuery}
          onChange={(e) => setRecipientSearchQuery(e.target.value)}
          className="w-full bg-zinc-905 border border-zinc-855 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-zinc-650 focus:outline-none"
        />
      </div>

      <div className="bg-zinc-905/60 border border-zinc-900 rounded-3xl p-3 max-h-52 overflow-y-auto space-y-2 no-scrollbar">
        {audienceType === "circle" && (
          <div className="space-y-1.5">
            {circles
              .filter(circle => circle.name.toLowerCase().includes(recipientSearchQuery.toLowerCase()))
              .map((circle) => {
                const isSelected = selectedCircleIds.includes(circle.id);
                return (
                  <div
                    key={circle.id}
                    onClick={() => setSelectedCircleIds([circle.id])}
                    className={`p-3 rounded-2xl flex items-center justify-between cursor-pointer border transition-all ${isSelected
                      ? "bg-[#ff8b66]/10 border-[#ff8b66]/30"
                      : "bg-zinc-950/40 border-zinc-900 hover:border-zinc-850"
                      }`}
                  >
                    <div className="flex items-center gap-2.5 text-left">
                      <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0">
                        <img
                          src={circle.groupImage || circle.avatars[0]}
                          className="w-full h-full object-cover"
                          alt=""
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs text-zinc-200 block font-semibold leading-none truncate">{circle.name}</span>
                        <span className="text-[9px] text-zinc-550 font-mono mt-1.5 block uppercase leading-none">{circle.membersCount} members</span>
                      </div>
                    </div>
                    <input
                      type="radio"
                      checked={isSelected}
                      readOnly
                      className="accent-[#ff8b66] w-3.5 h-3.5 pointer-events-none"
                    />
                  </div>
                );
              })}
          </div>
        )}

        {audienceType === "friends" && (
          <div className="space-y-1.5">
            {dbUsers
              .filter(user => {
                if (user.user_id === activeUserId) return false;
                if (!recipientSearchQuery) return true;
                const q = recipientSearchQuery.toLowerCase();
                return (
                  user.full_name.toLowerCase().includes(q) ||
                  user.username.toLowerCase().includes(q) ||
                  (user.phone_number || "").replace(/[^0-9]/g, "").includes(q.replace(/[^0-9]/g, ""))
                );
              })
              .map((user) => {
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
                    className={`p-2.5 rounded-2xl flex items-center justify-between cursor-pointer border transition-all ${isSelected
                      ? "bg-[#ff8b66]/10 border-[#ff8b66]/30"
                      : "bg-zinc-950/40 border-zinc-900 hover:border-zinc-855"
                      }`}
                  >
                    <div className="flex items-center gap-2.5 text-left">
                      <div className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-[10px] font-mono text-zinc-300">
                        {user.full_name[0]}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs text-zinc-200 block font-semibold leading-none">{user.full_name}</span>
                        <span className="text-[9px] text-zinc-550 font-mono mt-1 block">@{user.username}</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="accent-[#ff8b66] w-3.5 h-3.5 rounded pointer-events-none"
                    />
                  </div>
                );
              })}
          </div>
        )}

        {audienceType === "multiple" && (
          <div className="space-y-1.5">
            {circles
              .filter(circle => circle.name.toLowerCase().includes(recipientSearchQuery.toLowerCase()))
              .map((circle) => {
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
                    className={`p-2.5 rounded-2xl flex items-center justify-between cursor-pointer border transition-all ${isSelected
                      ? "bg-[#ff8b66]/10 border-[#ff8b66]/30"
                      : "bg-zinc-950/40 border-zinc-900 hover:border-zinc-855"
                      }`}
                  >
                    <div className="flex items-center gap-2.5 text-left">
                      <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0">
                        <img
                          src={circle.groupImage || circle.avatars[0]}
                          className="w-full h-full object-cover"
                          alt=""
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <span className="text-xs text-zinc-200 font-medium truncate max-w-[170px] leading-none">{circle.name}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="accent-[#ff8b66] w-3.5 h-3.5 pointer-events-none"
                    />
                  </div>
                );
              })}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center bg-zinc-950/60 border border-zinc-900 rounded-2xl p-3 text-xs">
        <span className="text-zinc-400 font-sans">Selected Participants</span>
        <span className="text-brand-peach font-mono font-bold text-sm">{selectedCount}</span>
      </div>

      {/* Enable Waitlist Toggle (Hidden if hideWaitlist is true) */}
      {!hideWaitlist && (
        <>
          <div className="flex justify-between items-center bg-zinc-950/60 border border-zinc-900 rounded-2xl p-3 text-xs">
            <span className="text-zinc-400 font-sans">Enable Waitlist</span>
            <input
              type="checkbox"
              checked={waitlistEnabled}
              onChange={(e) => {
                const enabled = e.target.checked;
                setWaitlistEnabled(enabled);
                if (enabled && joinLimit > selectedCount) {
                  setJoinLimit(selectedCount > 0 ? selectedCount : 1);
                }
              }}
              className="accent-[#ff8b66] w-4.5 h-4.5 cursor-pointer"
            />
          </div>

          {/* Join Limit Slider (conditional) */}
          {waitlistEnabled && (
            <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-4 space-y-2.5 text-left">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 font-sans">Maximum Going Participants</span>
                <span className="text-[#ff8b66] font-mono font-bold text-sm">{joinLimit}</span>
              </div>
              <input
                type="range"
                min={1}
                max={selectedCount > 0 ? selectedCount : 1}
                value={joinLimit}
                onChange={(e) => setJoinLimit(Number(e.target.value))}
                className="w-full accent-[#ff8b66] cursor-pointer"
              />
              <div className="flex justify-between text-[9px] font-mono text-zinc-600">
                <span>1</span>
                <span>{selectedCount > 0 ? selectedCount : 1}</span>
              </div>
            </div>
          )}
        </>
      )}

      <CreatePlanCTAButton
        text="INVITE PEOPLE"
        onPress={() => {
          const hasCircleRecipients = audienceType === "circle" && selectedCircleIds.length > 0;
          const hasFriendsRecipients = audienceType === "friends" && selectedFriendIds.length > 0;
          const hasMultiRecipients = audienceType === "multiple" && selectedCircleIds.length > 0;

          if (!hasCircleRecipients && !hasFriendsRecipients && !hasMultiRecipients) {
            triggerToast("Please pick at least one recipient first before proceeding.");
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
  );
};

import React, { useState } from "react";
import {
  Settings, User as UserIcon, Wallet, Camera, ChevronRight, ChevronLeft, Bell, CreditCard, Shield, HelpCircle, Database, LogOut
} from "lucide-react";
import { useProfileStore } from "../state/ProfileContext";
import { usePlansStore } from "../../plans/state/PlansContext";
import { useCirclesStore } from "../../circles/state/CirclesContext";
import { useWalletStore } from "../../wallet/state/WalletContext";
import { UserProfile } from "../../../core/types";
import { isMemoryVisibleToUser } from "../../../lib/memoryVisibility";
import { getMemoryContribution } from "../../../lib/memoryContribution";

interface ProfileScreenProps {
  onLogout: () => void;
  triggerToast: (msg: string) => void;
  setSelectedPlan: (plan: any | null) => void;
  setSelectedMemoryPlan: (plan: any | null) => void;
  setShowDbExplorer: (show: boolean) => void;
  setShowDepositModal: (show: boolean) => void;
}

export const ProfileScreen = ({
  onLogout,
  triggerToast,
  setSelectedPlan,
  setSelectedMemoryPlan,
  setShowDbExplorer,
  setShowDepositModal
}: ProfileScreenProps) => {
  const { userProfile, activeUserId, activeUserUuid, updateProfile, dbUsers } = useProfileStore();
  const {
    plans,
    dbMemories,
    dbMemoryAttendees,
    dbPlans,
    dbMemoryMovieVerdicts,
    dbMemoryRestaurantVotes,
    dbMemoryMatchResults,
    dbMemoryMvpVotes,
    dbMemoryBadmintonResults
  } = usePlansStore();
  const { circles, dbCircleMembers } = useCirclesStore();
  const { walletBalance, transactions } = useWalletStore();

  const [activeProfileSubView, setActiveProfileSubView] = useState<"none" | "settings" | "payments" | "account" | "notifications" | "privacy" | "help">("none");
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Profile Editor Form States
  const [editProfileName, setEditProfileName] = useState(userProfile?.name || "");
  const [editProfileBio, setEditProfileBio] = useState(userProfile?.bio || "");
  const [editProfileCollege, setEditProfileCollege] = useState(userProfile?.college_or_work || "");
  const [editProfileAvatar, setEditProfileAvatar] = useState(userProfile?.avatar || "");

  // Settings Toggles
  const [notifInvites, setNotifInvites] = useState(true);
  const [notifCircles, setNotifCircles] = useState(true);
  const [notifBills, setNotifBills] = useState(true);
  const [privacyShareLocation, setPrivacyShareLocation] = useState(true);
  const [privacyInvisible, setPrivacyInvisible] = useState(false);

  const [editingMemory, setEditingMemory] = useState<any | null>(null);
  const [editedCaption, setEditedCaption] = useState<string>("");

  const getInitialsAvatar = (name: string) => {
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=ff8b66`;
  };

  // Live Database Profile values
  const currentUser = dbUsers.find(u => u.id === activeUserUuid || u.user_id === activeUserId);
  const fullName = currentUser?.full_name || userProfile?.name || "";
  const bioText = currentUser?.bio || userProfile?.bio || "";
  const avatarUrl = currentUser?.profile_photo || userProfile?.avatar || "";
  const finalAvatar = avatarUrl || getInitialsAvatar(fullName);

  // Robust Plan Event Date Helper
  const getPlanSortDate = (plan: any): Date => {
    if (!plan) return new Date(0);
    // 1. Try plan.datetime
    if (plan.datetime) {
      const d = new Date(plan.datetime);
      if (!isNaN(d.getTime()) && d.getFullYear() > 2020) {
        return d;
      }
    }
    // 2. Try parsing plan.date
    if (plan.date) {
      if (plan.date === "TODAY") {
        return new Date();
      }
      if (plan.date === "TOMORROW") {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow;
      }
      const d = new Date(plan.date);
      if (!isNaN(d.getTime()) && d.getFullYear() > 2020) {
        return d;
      }
    }
    // 3. Fallback to plan.createdAt
    if (plan.createdAt) {
      const d = new Date(plan.createdAt);
      if (!isNaN(d.getTime())) {
        return d;
      }
    }
    return new Date(0);
  };

  // Relative Date calculation helper
  const getRelativeDateLabel = (dateInput: Date) => {
    try {
      if (isNaN(dateInput.getTime()) || dateInput.getFullYear() < 2020) {
        return "Recent";
      }
      
      const now = new Date();
      // Reset hours to calculate true day difference
      const d1 = new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate());
      const d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const diffTime = d2.getTime() - d1.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        return "Recent";
      }
      if (diffDays === 0) {
        return "Today";
      }
      if (diffDays === 1) {
        return "Yesterday";
      }
      if (diffDays < 7) {
        return `${diffDays} days ago`;
      }
      if (diffDays < 14) {
        return "1 week ago";
      }
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} weeks ago`;
    } catch {
      return "Recent";
    }
  };

  // Filter memories matching eligibility: memory_attendees.user_id === activeUserUuid
  const userAttendeeRows = dbMemoryAttendees.filter(a => a.user_id === activeUserUuid);
  const userMemoryIds = userAttendeeRows.map(a => a.memory_id);
  const eligibleMemories = dbMemories.filter(mem => userMemoryIds.includes(mem.id));

  // Sort memories by plans.datetime DESC (event date)
  const sortedMemories = eligibleMemories
    .map(mem => {
      const plan = plans.find(p => p.id === mem.plan_id || p.dbUuid === mem.plan_id);
      return { mem, plan };
    })
    .filter(item => !!item.plan)
    .sort((a, b) => {
      const timeA = getPlanSortDate(a.plan).getTime();
      const timeB = getPlanSortDate(b.plan).getTime();
      return timeB - timeA;
    });

  if (!userProfile) return null;

  return (
    <div id="profile_tab_pane" className="space-y-6 animate-fade-in relative">
      {/* SUB-VIEW 1: STANDARD USER PROFILE */}
      {activeProfileSubView === "none" && (
        <div id="profile_view_regular" className="space-y-6">
          {/* Header Row */}
          <div id="profile_header_row" className="flex items-center justify-between pb-3 border-b border-zinc-900/40 relative">
            <button
              onClick={() => setActiveProfileSubView("none")}
              className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-xs font-display font-black text-white tracking-[0.3em] uppercase absolute left-1/2 -translate-x-1/2">
              PLANLESS
            </h2>
            <div className="w-9 h-9" />
          </div>

          {/* Profile Identity Card (Centered) */}
          <div id="profile_identity_card" className="flex flex-col items-center text-center py-6 space-y-4 relative">
            <div className="relative w-36 h-36">
              <div className="w-full h-full rounded-full border-2 border-[#ff8b66] p-1.5 flex items-center justify-center">
                <img
                  src={finalAvatar}
                  alt={fullName}
                  className="w-full h-full rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <label
                className="absolute bottom-1 right-1 w-9 h-9 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:border-zinc-700 transition-colors"
                title="Change Avatar"
              >
                <Camera className="w-4 h-4 text-zinc-400" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === "string") {
                          updateProfile({
                            ...userProfile,
                            avatar: reader.result
                          } as any);
                          triggerToast("✓ Profile avatar updated!");
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </div>

            <div className="space-y-1.5">
              <h1 className="text-xl font-display font-black text-white tracking-wide">
                {fullName}
              </h1>
              {bioText && (
                <p className="text-xs text-zinc-450 leading-relaxed font-sans font-medium max-w-xs mx-auto">
                  {bioText}
                </p>
              )}
            </div>

            <button
              id="edit_profile_trigger_btn"
              onClick={() => {
                setEditProfileName(userProfile.name);
                setEditProfileBio(userProfile.bio || "");
                setEditProfileCollege(userProfile.college_or_work || "");
                setEditProfileAvatar(userProfile.avatar || "");
                setIsEditingProfile(true);
              }}
              className="px-6 py-2 rounded-full border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/40 text-[10px] font-mono tracking-widest text-zinc-300 hover:text-white uppercase transition-colors"
            >
              EDIT PROFILE
            </button>
          </div>

          {/* Inline Profile Edit View Card */}
          {isEditingProfile && (
            <form
              id="inline_profile_edit_form"
              onSubmit={(e) => {
                e.preventDefault();
                updateProfile({
                  ...userProfile,
                  name: editProfileName,
                  bio: editProfileBio,
                  college_or_work: editProfileCollege,
                  avatar: editProfileAvatar
                } as UserProfile);
                setIsEditingProfile(false);
                triggerToast("✓ Profile edits saved to database! ⚡");
              }}
              className="bg-zinc-950 border border-zinc-900 rounded-3xl p-5 space-y-4 animate-slide-up text-left"
            >
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                  📝 MINIMALIST PROFILE EDITOR
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingProfile(false);
                    triggerToast("Profile edits cancelled");
                  }}
                  className="text-[10px] text-zinc-500 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              {/* Choose Avatar */}
              <div className="flex items-center gap-3 py-1">
                <div className="relative shrink-0">
                  <img
                    src={editProfileAvatar}
                    className="w-12 h-12 rounded-full object-cover border border-zinc-800"
                    alt="preview"
                    referrerPolicy="no-referrer"
                  />
                  <label className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#ff5d41] hover:opacity-90 transition-opacity rounded-full flex items-center justify-center cursor-pointer shadow-lg border border-zinc-950">
                    <Camera className="w-3 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (typeof reader.result === "string") {
                              setEditProfileAvatar(reader.result);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
                <div className="text-[10px] font-sans text-zinc-500 space-y-0.5 text-left">
                  <p className="text-zinc-300 font-semibold">Change Profile Picture</p>
                  <p>Upload jpeg/png or click default initials button below</p>
                  <button
                    type="button"
                    onClick={() => setEditProfileAvatar(getInitialsAvatar(editProfileName))}
                    className="text-[#ff8b66] hover:underline font-mono text-[9px] mt-1 block"
                  >
                    Generative Initials Avatar 🌀
                  </button>
                </div>
              </div>

              {/* Fields */}
              <div className="space-y-3">
                <div>
                  <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editProfileName}
                    onChange={(e) => setEditProfileName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-850 rounded-xl px-3 py-2 text-xs focus:border-[#ff8b66] focus:outline-none text-white font-sans"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block mb-1">Academic / Work Group</label>
                  <input
                    type="text"
                    placeholder="e.g. SRM Chennai"
                    value={editProfileCollege}
                    onChange={(e) => setEditProfileCollege(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-850 rounded-xl px-3 py-2 text-xs focus:border-[#ff8b66] focus:outline-none text-white font-sans"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block mb-1">Short Bio</label>
                  <textarea
                    rows={2}
                    value={editProfileBio}
                    onChange={(e) => setEditProfileBio(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-850 rounded-xl px-3 py-2 text-xs focus:border-[#ff8b66] focus:outline-none text-white font-sans resize-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#ff5d41] hover:bg-opacity-90 text-white font-sans font-extrabold text-xs uppercase tracking-wider cursor-pointer"
              >
                Save Profile Signature
              </button>
            </form>
          )}

          {/* RECENT MEMORIES TIMELINE */}
          <div id="recent_memories_timeline" className="space-y-4 text-left">
            <div className="flex items-center justify-between px-1 border-b border-zinc-900 pb-2">
              <h4 className="text-[10px] font-mono text-zinc-400 uppercase tracking-[0.2em] font-semibold">
                Recent Memories
              </h4>
            </div>

            <div className="space-y-2">
              {sortedMemories.length === 0 ? (
                <div className="bg-zinc-900/10 border border-zinc-900/30 border-dashed rounded-2xl p-6 text-center space-y-1">
                  <p className="text-xs font-semibold text-zinc-400">No memories yet</p>
                  <p className="text-[10px] text-zinc-550 font-sans leading-relaxed">
                    Complete plans to build your memory timeline.
                  </p>
                </div>
              ) : (
                sortedMemories.map(({ mem, plan }) => {
                  const memType = (mem.memory_type || "").toLowerCase();
                  let icon = "⚡";
                  let verdictLabel = "Memory Recorded";
                  
                  if (memType === "movie") {
                    icon = "🎬";
                    const verdictRow = dbMemoryMovieVerdicts.find(
                      v => v.memory_id === mem.id && v.user_id === activeUserUuid
                    );
                    if (verdictRow) {
                      if (verdictRow.verdict === "loved_it") verdictLabel = "Loved It";
                      else if (verdictRow.verdict === "good") verdictLabel = "Good";
                      else if (verdictRow.verdict === "not_for_me") verdictLabel = "Not For Me";
                    }
                  } else if (memType === "dining") {
                    icon = "🍽️";
                    const voteRow = dbMemoryRestaurantVotes.find(
                      v => v.memory_id === mem.id && v.user_id === activeUserUuid
                    );
                    if (voteRow) {
                      if (voteRow.vote === "yes") verdictLabel = "Would Return";
                      else if (voteRow.vote === "maybe") verdictLabel = "Maybe";
                      else if (voteRow.vote === "no") verdictLabel = "No";
                    }
                  } else if (memType === "football") {
                    icon = "⚽";
                    verdictLabel = "Result Recorded";
                  } else if (memType === "badminton") {
                    icon = "🏸";
                    const badmintonRow = dbMemoryBadmintonResults.find(
                      r => r.memory_id === mem.id && r.user_id === activeUserUuid
                    );
                    if (badmintonRow) {
                      verdictLabel = `${badmintonRow.wins}W • ${badmintonRow.losses}L`;
                    } else {
                      verdictLabel = "0W • 0L";
                    }
                  }

                  return (
                    <div
                      key={mem.id}
                      onClick={() => {
                        if (plan) {
                          setSelectedMemoryPlan(plan);
                        }
                      }}
                      className="bg-zinc-900/30 border border-zinc-900/40 hover:border-zinc-800/80 rounded-xl py-2.5 px-3.5 flex items-center justify-between transition-all duration-200 cursor-pointer hover:bg-zinc-900/50 active:scale-[0.985]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-base shrink-0">{icon}</span>
                        <div className="min-w-0">
                          <h5 className="text-[11px] font-display font-black text-zinc-200 tracking-wide uppercase leading-none">
                            {plan?.title || "Meetup"}
                          </h5>
                          <p className="text-[9.5px] font-mono text-brand-peach mt-1.5 font-bold leading-none">
                            {verdictLabel}
                          </p>
                        </div>
                      </div>
                      <span className="text-[8.5px] font-mono text-zinc-500/75 shrink-0 select-none">
                        {getRelativeDateLabel(getPlanSortDate(plan))}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* SECTION 6 – SETTINGS OPTIONS AT THE BOTTOM */}
          <div id="profile_settings_bottom_segment" className="border-t border-zinc-900/80 pt-5 space-y-3 text-left">
            <h4 className="text-[9px] font-mono text-zinc-500 uppercase tracking-[0.2em] font-bold px-1">
              Settings & Preferences
            </h4>
            <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-1.5 divide-y divide-zinc-900">
              <button
                onClick={() => setActiveProfileSubView("account")}
                className="w-full flex items-center justify-between p-3.5 hover:bg-zinc-900/40 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <UserIcon className="w-4 h-4 text-zinc-400" />
                  <span className="text-xs font-semibold text-zinc-250">Account</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500" />
              </button>

              <button
                onClick={() => setActiveProfileSubView("notifications")}
                className="w-full flex items-center justify-between p-3.5 hover:bg-zinc-900/40 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-zinc-400" />
                  <span className="text-xs font-semibold text-zinc-250">Notifications</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500" />
              </button>

              <button
                onClick={() => setActiveProfileSubView("privacy")}
                className="w-full flex items-center justify-between p-3.5 hover:bg-zinc-900/40 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-zinc-400" />
                  <span className="text-xs font-semibold text-zinc-250">Privacy</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500" />
              </button>

              <button
                onClick={() => setActiveProfileSubView("help")}
                className="w-full flex items-center justify-between p-3.5 hover:bg-zinc-900/40 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-4 h-4 text-zinc-400" />
                  <span className="text-xs font-semibold text-zinc-250">Help</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500" />
              </button>

              <button
                onClick={() => {
                  triggerToast("Switching profile sessions... Bye! 👋");
                  setTimeout(() => {
                    onLogout();
                  }, 500);
                }}
                className="w-full flex items-center justify-between p-3.5 hover:bg-zinc-900/40 transition-colors text-left text-red-400"
              >
                <div className="flex items-center gap-3">
                  <LogOut className="w-4 h-4 text-red-400/80" />
                  <span className="text-xs font-semibold">Logout</span>
                </div>
                <ChevronRight className="w-4 h-4 text-red-500/60" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIRECT SUBMENU: ACCOUNT PRIVACY/IDENTITY (1) */}
      {activeProfileSubView === "account" && (
        <div id="subview_account_details" className="space-y-5 animate-slide-up text-left">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
            <button
              onClick={() => setActiveProfileSubView("none")}
              className="text-zinc-500 hover:text-white flex items-center gap-1 text-[10px] uppercase font-mono font-bold"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </button>
            <span className="text-[9px] font-mono text-zinc-400 font-bold uppercase">Identity Node Info</span>
            <div className="w-8 shrink-0" />
          </div>

          <div className="space-y-4">
            <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-5 space-y-4">
              <h3 className="text-xs font-display font-black text-white uppercase tracking-wider">
                Academic Verified Node
              </h3>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                Planless matches people from verified campus cohorts or trusted coordinates. Your profile was automatically mapped via verified credentials.
              </p>

              <div className="space-y-2 border-t border-zinc-900 pt-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-550 font-mono text-[10px]">VERIFIED PHONE:</span>
                  <span className="text-zinc-300 font-semibold">{userProfile.phone || "+91 90002 00001"}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-550 font-mono text-[10px]">VERIFIED GROUP:</span>
                  <span className="text-zinc-300 font-semibold">{userProfile.college_or_work || "SRM Chennai"}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-550 font-mono text-[10px]">AUTHENTICATED AT:</span>
                  <span className="text-zinc-300 font-mono text-[10px]">May 2026</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-550 font-mono text-[10px]">IDENTITY TOKEN:</span>
                  <span className="text-zinc-300 font-mono text-[9px] select-all uppercase">{activeUserId}_VERIFIED_SEC_SSL</span>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-4 space-y-1.5 text-left">
              <span className="text-[10px] font-mono text-sky-400 font-bold">✓ CORE RELATIONAL DATA MATCH: TRUE</span>
              <p className="text-[10px] text-zinc-500 leading-relaxed font-mono">
                Your identity coordinates securely bind with SQL index (dbUsers, Primary Key user_id: '{activeUserId}'). Changing college require verified email resubmissions.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* DIRECT SUBMENU: NOTIFICATION OVERRIDES (2) */}
      {activeProfileSubView === "notifications" && (
        <div id="subview_notifications_settings" className="space-y-5 animate-slide-up text-left">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
            <button
              onClick={() => setActiveProfileSubView("none")}
              className="text-zinc-500 hover:text-white flex items-center gap-1 text-[10px] uppercase font-mono font-bold"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </button>
            <span className="text-[9px] font-mono text-zinc-400 font-bold uppercase">Spontaneous Alerts</span>
            <div className="w-8 shrink-0" />
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-xs font-display font-black text-white uppercase tracking-wider">
                PING TRIGGERS
              </h3>
              <p className="text-[10px] text-zinc-550">
                Sp spontaneous pings should strictly respect low cognitive load. Customize alerts to your comfort.
              </p>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-2.5 divide-y divide-zinc-900">
              <div className="flex items-center justify-between p-3.5">
                <div className="space-y-0.5 max-w-[70%]">
                  <h4 className="text-xs font-semibold text-zinc-200">SMS Spontaneous Invites</h4>
                  <p className="text-[9.5px] text-zinc-500">Recieve urgent coordinate pings from friends</p>
                </div>
                <button
                  onClick={() => {
                    setNotifInvites(!notifInvites);
                    triggerToast(notifInvites ? "Spontaneous invite alerts paused" : "✓ Spontaneous invites enabled!");
                  }}
                  className={`w-10 h-6.5 rounded-full p-1 transition-all ${notifInvites ? "bg-brand-orange text-right" : "bg-zinc-800 text-left"}`}
                >
                  <div className={`w-4.5 h-4.5 rounded-full bg-white shadow transition-all ${notifInvites ? "translate-x-3.5" : "translate-x-0"}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5">
                <div className="space-y-0.5 max-w-[70%]">
                  <h4 className="text-xs font-semibold text-zinc-200">Circle Match Pings</h4>
                  <p className="text-[9.5px] text-zinc-500">Live chat, meetup updates, or soccer matches</p>
                </div>
                <button
                  onClick={() => {
                    setNotifCircles(!notifCircles);
                    triggerToast(notifCircles ? "Circles match pings muted" : "✓ Infinite circle alerts active!");
                  }}
                  className={`w-10 h-6.5 rounded-full p-1 transition-all ${notifCircles ? "bg-brand-orange text-right" : "bg-zinc-800 text-left"}`}
                >
                  <div className={`w-4.5 h-4.5 rounded-full bg-white shadow transition-all ${notifCircles ? "translate-x-3.5" : "translate-x-0"}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5">
                <div className="space-y-0.5 max-w-[70%]">
                  <h4 className="text-xs font-semibold text-zinc-200">Wallet & Co-pay Reminders</h4>
                  <p className="text-[9.5px] text-zinc-500">Overdue bills, cinema settlements, or refund statuses</p>
                </div>
                <button
                  onClick={() => {
                    setNotifBills(!notifBills);
                    triggerToast(notifBills ? "Wallet pings paused" : "✓ Co-pay ledger reminders active!");
                  }}
                  className={`w-10 h-6.5 rounded-full p-1 transition-all ${notifBills ? "bg-brand-orange text-right" : "bg-zinc-800 text-left"}`}
                >
                  <div className={`w-4.5 h-4.5 rounded-full bg-white shadow transition-all ${notifBills ? "translate-x-3.5" : "translate-x-0"}`} />
                </button>
              </div>
            </div>

            <p className="text-[9px] text-zinc-500 text-center font-mono italic">
              Planless never sells or forwards your numbers. Privacy is absolute.
            </p>
          </div>
        </div>
      )}

      {/* DIRECT SUBMENU: PRIVACY & MAP indicators (4) */}
      {activeProfileSubView === "privacy" && (
        <div id="subview_privacy_rules" className="space-y-5 animate-slide-up text-left">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
            <button
              onClick={() => setActiveProfileSubView("none")}
              className="text-zinc-500 hover:text-white flex items-center gap-1 text-[10px] uppercase font-mono font-bold"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </button>
            <span className="text-[9px] font-mono text-zinc-400 font-bold uppercase">Privacy Rules</span>
            <div className="w-8 shrink-0" />
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-xs font-display font-black text-white uppercase tracking-wider">
                COORDINATE VISIBILITY
              </h3>
              <p className="text-[10px] text-zinc-550 leading-relaxed font-sans">
                Planless maps only verified location anchors. You never share broad realtime live telemetry paths.
              </p>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-2.5 divide-y divide-zinc-900">
              <div className="flex items-center justify-between p-3.5">
                <div className="space-y-0.5 max-w-[70%] text-left">
                  <h4 className="text-xs font-semibold text-zinc-200">Share Campus Anchors</h4>
                  <p className="text-[9.5px] text-zinc-500 font-sans">Allow friends to spot your preferred hangout nodes</p>
                </div>
                <button
                  onClick={() => {
                    setPrivacyShareLocation(!privacyShareLocation);
                    triggerToast(privacyShareLocation ? "Campus anchor syncing paused" : "✓ Campus anchors are active!");
                  }}
                  className={`w-10 h-6.5 rounded-full p-1 transition-all ${privacyShareLocation ? "bg-brand-orange text-right" : "bg-zinc-800 text-left"}`}
                >
                  <div className={`w-4.5 h-4.5 rounded-full bg-white shadow transition-all ${privacyShareLocation ? "translate-x-3.5" : "translate-x-0"}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5">
                <div className="space-y-0.5 max-w-[70%] text-left">
                  <h4 className="text-xs font-semibold text-zinc-200">Ghost Mode</h4>
                  <p className="text-[9.5px] text-zinc-500 font-sans">Completely hide spontaneous active markers</p>
                </div>
                <button
                  onClick={() => {
                    setPrivacyInvisible(!privacyInvisible);
                    triggerToast(privacyInvisible ? "Ghost mode disabled" : "✓ Ghost mode fully enabled! 👻");
                  }}
                  className={`w-10 h-6.5 rounded-full p-1 transition-all ${privacyInvisible ? "bg-brand-orange text-right" : "bg-zinc-800 text-left"}`}
                >
                  <div className={`w-4.5 h-4.5 rounded-full bg-white shadow transition-all ${privacyInvisible ? "translate-x-3.5" : "translate-x-0"}`} />
                </button>
              </div>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-4 font-mono text-[9px] text-zinc-500 leading-relaxed text-left">
              ⚙️ STATUS INDICATOR LOG: CURRENTLY ACTIVE INDEPENDENT • NO EXTERNAL TRACKING AGENTS LOADED
            </div>
          </div>
        </div>
      )}

      {/* DIRECT SUBMENU: FAQ & METHODOLOGY (5) */}
      {activeProfileSubView === "help" && (
        <div id="subview_help_faqs" className="space-y-5 animate-slide-up text-left">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
            <button
              onClick={() => setActiveProfileSubView("none")}
              className="text-zinc-500 hover:text-white flex items-center gap-1 text-[10px] uppercase font-mono font-bold"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </button>
            <span className="text-[9px] font-mono text-zinc-400 font-bold uppercase">Help Desk FAQ</span>
            <div className="w-8 shrink-0" />
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-display font-black text-white uppercase tracking-wider">
              Frequently Asked Questions
            </h3>

            <div className="space-y-2.5">
              {[
                {
                  q: "How does UPI co-pay splitting work?",
                  a: "When you join Cinema, Dining, or turf bookings with cost metrics, the split amount is instantly reserved and transferred from your wallet. Refund matches return here instantly."
                },
                {
                  q: "Who can see my spontaneous plans?",
                  a: "Only verified friends inside your Circles have coordinates mapping to your active sessions. Complete strangers can never spot your plans."
                },
                {
                  q: "Is there a push fee or service penalty?",
                  a: "Zero fees. Planless operates entirely without marketing margins, keeping spontaneous real-world coordination free of transactional noise."
                }
              ].map((item, i) => (
                <div key={i} className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 space-y-1.5 shadow-sm text-left">
                  <h4 className="text-xs font-bold text-zinc-200">Q: {item.q}</h4>
                  <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">{item.a}</p>
                </div>
              ))}
            </div>

            <div className="border border-zinc-900 rounded-2xl p-4 bg-zinc-900/10 space-y-1 text-center">
              <p className="text-[10px] font-semibold text-zinc-350 font-mono uppercase">Planless Campus Support Cell</p>
              <p className="text-[9px] text-zinc-550 mt-0.5">Contact coordinate coordinators: support@planless.space</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

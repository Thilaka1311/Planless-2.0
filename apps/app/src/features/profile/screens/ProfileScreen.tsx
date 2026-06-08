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
  const { userProfile, activeUserId, activeUserUuid, updateProfile } = useProfileStore();
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

  if (!userProfile) return null;

  return (
    <div id="profile_tab_pane" className="space-y-6 animate-fade-in relative">
      {/* SUB-VIEW 1: STANDARD USER PROFILE */}
      {activeProfileSubView === "none" && (
        <div id="profile_view_regular" className="space-y-6">
          {/* Header Row */}
          <div id="profile_header_row" className="flex items-center justify-between pb-2 border-b border-zinc-950">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-peach animate-pulse" />
              <h2 className="text-xs font-display font-black text-white tracking-[0.2em] uppercase">
                Profile Space
              </h2>
            </div>
          </div>

          {/* Profile Identity Card */}
          <div id="profile_identity_card" className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-900 rounded-3xl p-5 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#ff8b66]/5 rounded-full blur-xl pointer-events-none" />

            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <img
                  src={userProfile.avatar}
                  alt={userProfile.name}
                  className="w-16 h-16 rounded-full border-2 border-zinc-800 object-cover"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-zinc-900 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-white block" />
                </span>
              </div>

              <div className="space-y-1 min-w-0 flex-1 text-left">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base font-display font-black text-white leading-none truncate">
                    {userProfile.name}
                  </h1>
                  <span className="text-[7.5px] uppercase tracking-wide font-mono bg-brand-orange/15 text-brand-peach px-1.5 py-0.5 rounded border border-brand-orange/20 select-none">
                    PRO
                  </span>
                </div>

                <span className="text-[10px] font-mono text-zinc-500 block">
                  @{userProfile.name.toLowerCase().replace(/\s+/g, "") || "thilak_sundar"}
                </span>

                {userProfile.college_or_work && (
                  <div className="inline-flex items-center gap-1 bg-zinc-950 px-2 py-0.5 rounded-full border border-zinc-90 w-fit">
                    <span className="text-[8px] text-zinc-400 font-sans">🎓 {userProfile.college_or_work}</span>
                  </div>
                )}
              </div>
            </div>

            {userProfile.bio && (
              <p className="text-xs text-zinc-350 leading-relaxed font-sans font-light text-left">
                {userProfile.bio}
              </p>
            )}

            {/* Actions Bar */}
            <div className="flex gap-2.5 pt-1">
              <button
                id="edit_profile_trigger_btn"
                onClick={() => {
                  setEditProfileName(userProfile.name);
                  setEditProfileBio(userProfile.bio || "");
                  setEditProfileCollege(userProfile.college_or_work || "");
                  setEditProfileAvatar(userProfile.avatar || "");
                  setIsEditingProfile(true);
                }}
                className="w-full py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-200 font-sans text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            </div>
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

          {/* SECTION 1 – STATS */}
          <div id="profile_stats_grid" className="grid grid-cols-4 gap-2.5">
            <div className="bg-zinc-900/60 border border-zinc-900/80 rounded-2xl p-3 text-center space-y-1">
              <h3 className="text-base font-display font-black text-white leading-none">27</h3>
              <p className="text-[8.5px] font-mono text-zinc-500 uppercase tracking-wider">Hosted</p>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-900/80 rounded-2xl p-3 text-center space-y-1">
              <h3 className="text-base font-display font-black text-white leading-none">84</h3>
              <p className="text-[8.5px] font-mono text-zinc-500 uppercase tracking-wider">Attended</p>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-900/80 rounded-2xl p-3 text-center space-y-1">
              <h3 className="text-base font-display font-black text-white leading-none">12</h3>
              <p className="text-[8.5px] font-mono text-zinc-500 uppercase tracking-wider">Circles</p>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-900/80 rounded-2xl p-3 text-center space-y-1">
              <h3 className="text-base font-display font-black text-white leading-none">31</h3>
              <p className="text-[8.5px] font-mono text-zinc-500 uppercase tracking-wider">Memories</p>
            </div>
          </div>

          {/* SECTION 2 – UPCOMING PLANS */}
          <div id="upcoming_plans_segment" className="space-y-2.5 text-left">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-[9px] font-mono text-zinc-400 uppercase tracking-[0.2em] font-bold">
                Upcoming Plans
              </h4>
            </div>

            {plans.filter(p => !p.isHappened && p.status !== "cancelled" && p.joinedUsers.some(u => u.name === userProfile.name)).length === 0 ? (
              <div className="bg-zinc-900/30 border border-zinc-900 border-dashed rounded-2xl p-5 text-center text-zinc-500 text-xs font-sans">
                No upcoming plans scheduled.
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 snap-x">
                {plans.filter(p => !p.isHappened && p.status !== "cancelled" && p.joinedUsers.some(u => u.name === userProfile.name)).map(p => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlan(p)}
                    className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 rounded-2xl w-[140px] shrink-0 p-2.5 text-left snap-start cursor-pointer transition-colors space-y-2 select-none"
                  >
                    <div className="h-20 rounded-xl overflow-hidden relative">
                      <img
                        src={p.coverImage}
                        alt={p.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      {p.isLive && (
                        <div className="absolute top-1 right-1 bg-red-600 text-[6.5px] font-mono font-black text-white px-1.5 py-0.5 rounded tracking-wider uppercase animate-pulse">
                          LIVE
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-[10px] font-display font-black text-zinc-200 truncate leading-snug">
                        {p.title}
                      </h5>
                      <p className="text-[8px] font-sans text-zinc-400 truncate mt-0.5">
                        📅 {p.date} • {p.time || "18:00"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 3 – RECENT MEMORIES */}
          <div id="recent_memories_segment" className="space-y-3 text-left">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-[9px] font-mono text-zinc-400 uppercase tracking-[0.2em] font-bold">
                Recent Memories
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { title: "Interstellar", category: "movie", verdict: "Loved It", icon: "🎬" },
                { title: "Toscano", category: "dining", verdict: "Would Return", icon: "🍽️" },
                { title: "Sunday Match", category: "football", verdict: "MVP Voted", icon: "⚽" },
                { title: "Badminton Night", category: "badminton", verdict: "4W • 2L", icon: "🏸" }
              ].map((mem, idx) => (
                <div
                  key={idx}
                  className="bg-zinc-900/60 border border-zinc-900 rounded-2xl p-3.5 space-y-1.5 hover:border-zinc-800 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg">{mem.icon}</span>
                    <span className="text-[7.5px] font-mono text-zinc-500 uppercase tracking-wider">{mem.category}</span>
                  </div>
                  <div>
                    <h5 className="text-[11px] font-display font-black text-zinc-200 truncate">
                      {mem.title}
                    </h5>
                    <p className="text-[9.5px] font-mono text-brand-peach font-bold mt-0.5">
                      {mem.verdict}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 4 – SPORTS SUMMARY */}
          <div id="sports_summary_segment" className="space-y-3 text-left">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-[9px] font-mono text-zinc-400 uppercase tracking-[0.2em] font-bold">
                Sports
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* Football Card */}
              <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-900 rounded-2xl p-3.5 space-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-500/5 rounded-full blur-lg pointer-events-none" />
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">⚽</span>
                  <h5 className="text-[10px] font-display font-black text-white uppercase tracking-wider">Football</h5>
                </div>
                <div className="space-y-1 font-mono">
                  <div className="flex justify-between items-center text-[9px]">
                    <span className="text-zinc-500">Matches Played</span>
                    <span className="text-zinc-200 font-bold">12 Matches</span>
                  </div>
                  <div className="flex justify-between items-center text-[9px]">
                    <span className="text-zinc-500">MVP Awards</span>
                    <span className="text-brand-peach font-bold">3 MVPs</span>
                  </div>
                </div>
              </div>

              {/* Badminton Card */}
              <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-900 rounded-2xl p-3.5 space-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-12 h-12 bg-sky-500/5 rounded-full blur-lg pointer-events-none" />
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🏸</span>
                  <h5 className="text-[10px] font-display font-black text-white uppercase tracking-wider">Badminton</h5>
                </div>
                <div className="space-y-1 font-mono">
                  <div className="flex justify-between items-center text-[9px]">
                    <span className="text-zinc-500">Wins / Losses</span>
                    <span className="text-zinc-200 font-bold">42W • 18L</span>
                  </div>
                  <div className="flex justify-between items-center text-[9px]">
                    <span className="text-zinc-500">MVP Awards</span>
                    <span className="text-brand-peach font-bold">7 MVPs</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 5 – YOUR CIRCLES */}
          <div id="your_circles_segment" className="space-y-3 text-left">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-[9px] font-mono text-zinc-400 uppercase tracking-[0.2em] font-bold">
                Your Circles
              </h4>
              <span className="text-[8.5px] font-mono text-zinc-600">
                {circles.filter(c => c.membersList?.some((m: any) => m.name === userProfile.name)).length} Joined
              </span>
            </div>

            {circles.filter(c => c.membersList?.some((m: any) => m.name === userProfile.name)).length === 0 ? (
              <div className="bg-zinc-900/30 border border-zinc-900 border-dashed rounded-2xl p-5 text-center text-zinc-500 text-xs font-sans">
                You haven't joined any circles yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {circles.filter(c => c.membersList?.some((m: any) => m.name === userProfile.name)).map((circle: any) => {
                  const circleActivePlans = plans.filter((p: any) => p.circleId === circle.id && !p.isHappened && p.status !== "cancelled");
                  return (
                    <div key={circle.id} className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={circle.groupImage || circle.avatars?.[0] || "https://images.unsplash.com/photo-1543351611-58f69d7c1781?auto=format&fit=crop&q=80&w=200"}
                          className="w-8 h-8 rounded-xl object-cover border border-zinc-800"
                          alt={circle.name}
                        />
                        <div>
                          <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wide">{circle.name}</h4>
                          <p className="text-[9px] text-zinc-500 mt-0.5">
                            {circleActivePlans.length > 0 ? `🔥 Next: ${circleActivePlans[0].title}` : "No active plans"}
                          </p>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-[#ff8b66] font-bold bg-[#ff8b66]/10 px-2.5 py-0.5 rounded border border-[#ff8b66]/15">
                        {circleActivePlans.length} Active
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
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

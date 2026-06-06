import React, { useState } from "react";
import {
  Settings, User as UserIcon, Wallet, Camera, ChevronRight, ChevronLeft, Bell, CreditCard, Shield, HelpCircle, Database, LogOut
} from "lucide-react";
import { useProfileStore } from "../state/ProfileContext";
import { usePlansStore } from "../../plans/state/PlansContext";
import { useCirclesStore } from "../../circles/state/CirclesContext";
import { useWalletStore } from "../../wallet/state/WalletContext";
import { UserProfile } from "../../../core/types";

interface ProfileScreenProps {
  onLogout: () => void;
  triggerToast: (msg: string) => void;
  setSelectedPlan: (plan: any | null) => void;
  setShowDbExplorer: (show: boolean) => void;
  setShowDepositModal: (show: boolean) => void;
}

export const ProfileScreen = ({
  onLogout,
  triggerToast,
  setSelectedPlan,
  setShowDbExplorer,
  setShowDepositModal
}: ProfileScreenProps) => {
  const { userProfile, activeUserId, activeUserUuid, updateProfile } = useProfileStore();
  const { plans, dbMemories } = usePlansStore();
  const { circles } = useCirclesStore();
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
            <button
              id="profile_settings_gear_btn"
              onClick={() => setActiveProfileSubView("settings")}
              className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
              title="Access Preferences & Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
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
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-200 font-sans text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>

              <button
                id="direct_wallet_jump_btn"
                onClick={() => setActiveProfileSubView("payments")}
                className="py-2.5 px-4 rounded-xl bg-zinc-950 border border-zinc-900 hover:border-zinc-800 text-zinc-355 font-mono text-xs tracking-wide transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Wallet className="w-3.5 h-3.5 text-[#ff8b66]" />
                <span>₹{walletBalance.toFixed(0)}</span>
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

          {/* Stats Grid */}
          <div id="spontaneous_stats_grid" className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-900/60 border border-zinc-900/80 rounded-2xl p-3 text-center space-y-1">
              <span className="text-[16px]">👥</span>
              <h3 className="text-base font-display font-black text-white leading-none">
                {plans.filter(p => p.status !== "cancelled" && p.isHappened && p.joinedUsers.some(u => u.name === userProfile.name)).length}
              </h3>
              <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Plans Join</p>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-900/80 rounded-2xl p-3 text-center space-y-1">
              <span className="text-[16px]">🕸️</span>
              <h3 className="text-base font-display font-black text-white leading-none">
                {circles.filter(c => c.membersList.some(m => m.name === userProfile.name)).length}
              </h3>
              <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Active Cells</p>
            </div>

            <button
              onClick={() => setActiveProfileSubView("payments")}
              className="bg-zinc-900/60 border border-zinc-900/80 hover:bg-zinc-900 hover:border-zinc-800 rounded-2xl p-3 text-center space-y-1 cursor-pointer transition-all active:scale-95 text-left"
            >
              <div className="text-center space-y-1">
                <span className="text-[16px]">💳</span>
                <h3 className="text-base font-display font-black text-brand-peach leading-none">
                  ₹{walletBalance.toFixed(0)}
                </h3>
                <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Wallet Net</p>
              </div>
            </button>
          </div>

          {/* Spontaneous History Row */}
          <div id="recently_attended_segment" className="space-y-2.5 text-left">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-[9px] font-mono text-zinc-400 uppercase tracking-[0.2em] font-bold">
                Spontaneous History
              </h4>
              <span className="text-[8.5px] font-mono text-zinc-650">
                Completed Adventures
              </span>
            </div>

            {plans.filter(p => p.status !== "cancelled" && p.isHappened && p.joinedUsers.some(u => u.name === userProfile.name)).length === 0 ? (
              <div className="bg-zinc-900/30 border border-zinc-900 border-dashed rounded-2xl p-5 text-center text-zinc-500 text-xs font-sans">
                Your completed spontaneous meets will stack here. Go to plans to archive!
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 snap-x">
                {plans.filter(p => p.status !== "cancelled" && p.isHappened && p.joinedUsers.some(u => u.name === userProfile.name)).map(p => (
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
                      <div className="absolute top-1 right-1 bg-black/70 backdrop-blur-sm px-1 rounded">
                        <span className="text-[7px] font-mono text-emerald-400 capitalize">{p.category}</span>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-[10px] font-display font-black text-zinc-200 truncate leading-snug">
                        {p.title}
                      </h5>
                      <p className="text-[8px] font-sans text-zinc-500 truncate mt-0.5">
                        📅 {p.date}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Snapshots Gallery */}
          <div id="memories_gallery_segment" className="space-y-3.5 text-left">
            <div className="flex items-center justify-between px-1 border-b border-zinc-950 pb-1.5">
              <h4 className="text-[9px] font-mono text-zinc-400 uppercase tracking-[0.2em] font-bold">
                📸 Snapshot Memories
              </h4>
              <span className="text-[8.5px] font-mono text-zinc-600">
                {dbMemories.filter(m => m.uploaded_by === activeUserUuid || m.uploaded_by === activeUserId).length} snaps saved
              </span>
            </div>

            {dbMemories.filter(m => m.uploaded_by === activeUserUuid || m.uploaded_by === activeUserId).length === 0 ? (
              <div className="bg-zinc-900/30 border border-zinc-900 border-dashed rounded-2xl p-6 text-center text-zinc-500 text-xs font-sans">
                Upload spontaneous snapshot stories inside Completed plans to view them here.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {dbMemories.filter(m => m.uploaded_by === activeUserUuid || m.uploaded_by === activeUserId).map(mem => (
                  <div
                    key={mem.memory_id}
                    onClick={() => {
                      setEditingMemory(mem);
                      setEditedCaption(mem.caption || "");
                    }}
                    className="aspect-square bg-zinc-900 border border-zinc-850 rounded-xl overflow-hidden relative group cursor-pointer active:scale-95 transition-all shadow-md"
                    title="Click to tweak caption or delete snapshot"
                  >
                    <img
                      src={mem.media_url}
                      alt="Your memory"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-end p-1.5 transition-opacity pointer-events-none">
                      <span className="text-[7.5px] font-sans font-bold text-white truncate w-full">
                        "{mem.caption}"
                      </span>
                    </div>
                    <span className="absolute top-1 right-1 bg-[#ff8b66] text-white text-[6.5px] font-sans font-bold px-1 rounded-sm shadow">
                      You
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: SETTINGS Preferences Directory */}
      {activeProfileSubView === "settings" && (
        <div id="settings_preferences_directory" className="space-y-5 animate-slide-up text-left">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
            <button
              onClick={() => setActiveProfileSubView("none")}
              className="text-zinc-500 hover:text-white flex items-center gap-1 text-[10px] uppercase font-mono font-bold"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </button>
            <span className="text-[9.5px] font-mono text-[#ff8b66] font-bold uppercase tracking-widest">Preferences Console</span>
            <div className="w-8 shrink-0" />
          </div>

          <div className="space-y-1">
            <h3 className="text-xs font-display font-black text-zinc-100 uppercase tracking-wider">
              TRUST & ACCOUNT OPTIONS
            </h3>
            <p className="text-[10px] text-zinc-550 font-sans">
              Configure your spontaneous presence, notification pings, ledger and split payment wallets.
            </p>
          </div>

          <div id="settings_list_navigator" className="space-y-2 pt-1">
            <button
              onClick={() => setActiveProfileSubView("account")}
              className="w-full bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 rounded-2xl p-4 flex items-center justify-between transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#ff5d41]/10 text-brand-peach flex items-center justify-center">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">Profile & Verification Node</h4>
                  <span className="text-[9px] font-mono text-zinc-500 uppercase">Verified identity status</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            </button>

            <button
              onClick={() => setActiveProfileSubView("notifications")}
              className="w-full bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 rounded-2xl p-4 flex items-center justify-between transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">Alerts & Spontaneous Pings</h4>
                  <span className="text-[9px] font-mono text-zinc-500 uppercase">Manage invite & scheduling push</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            </button>

            <button
              onClick={() => setActiveProfileSubView("payments")}
              className="w-full bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 rounded-2xl p-4 flex items-center justify-between transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">Payments & Co-Pay Ledger</h4>
                  <span className="text-[9px] font-mono text-[#ff8b66] uppercase font-bold">Available balance • ₹{walletBalance.toFixed(0)}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            </button>

            <button
              onClick={() => setActiveProfileSubView("privacy")}
              className="w-full bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 rounded-2xl p-4 flex items-center justify-between transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">Privacy & Coordinate Lock</h4>
                  <span className="text-[9px] font-mono text-zinc-500 uppercase">Hide map drift and active indicators</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            </button>

            <button
              onClick={() => setActiveProfileSubView("help")}
              className="w-full bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 rounded-2xl p-4 flex items-center justify-between transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">Planless FAQ & Guides</h4>
                  <span className="text-[9px] font-mono text-zinc-500 uppercase">Bill split rules & circles info</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            </button>

            <button
              onClick={() => {
                setShowDbExplorer(true);
                triggerToast("Opened SQLite Relational Console! 📊");
              }}
              className="w-full bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 rounded-2xl p-4 flex items-center justify-between transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">System Relational Terminal</h4>
                  <span className="text-[9px] font-mono text-zinc-550 uppercase">Inspect Live SQL-Like Schema Tables</span>
                </div>
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
              className="w-full bg-[#ff5d41]/5 hover:bg-[#ff5d41]/10 border border-[#ff5d41]/20 rounded-2xl p-4 flex items-center justify-between transition-colors text-left text-[#ff5d41]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#ff5d41]/10 flex items-center justify-center">
                  <LogOut className="w-4 h-4 text-[#ff5d41]" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold">Exit Session / Log Out</h4>
                  <span className="text-[9px] font-mono text-[#ff8b66]/60 uppercase">Reset onboarding profile database</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#ff5d41]/60" />
            </button>
          </div>
        </div>
      )}

      {/* DIRECT SUBMENU: ACCOUNT PRIVACY/IDENTITY (1) */}
      {activeProfileSubView === "account" && (
        <div id="subview_account_details" className="space-y-5 animate-slide-up text-left">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
            <button
              onClick={() => setActiveProfileSubView("settings")}
              className="text-zinc-500 hover:text-white flex items-center gap-1 text-[10px] uppercase font-mono font-bold"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Settings
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
                  <span className="text-zinc-500 font-mono text-[10px]">VERIFIED PHONE:</span>
                  <span className="text-zinc-300 font-semibold">{userProfile.phone || "+91 90002 00001"}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500 font-mono text-[10px]">VERIFIED GROUP:</span>
                  <span className="text-zinc-300 font-semibold">{userProfile.college_or_work || "SRM Chennai"}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500 font-mono text-[10px]">AUTHENTICATED AT:</span>
                  <span className="text-zinc-300 font-mono text-[10px]">May 2026</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500 font-mono text-[10px]">IDENTITY TOKEN:</span>
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
              onClick={() => setActiveProfileSubView("settings")}
              className="text-zinc-500 hover:text-white flex items-center gap-1 text-[10px] uppercase font-mono font-bold"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Settings
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

      {/* DIRECT SUBMENU: PAYMENTS, balances & LEDGER HISTORY (3) */}
      {activeProfileSubView === "payments" && (
        <div id="subview_payments_wallet" className="space-y-6 animate-slide-up text-left">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
            <button
              onClick={() => setActiveProfileSubView("settings")}
              className="text-zinc-500 hover:text-white flex items-center gap-1 text-[10px] uppercase font-mono font-bold"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Settings
            </button>
            <span className="text-[9px] font-mono text-zinc-400 font-bold uppercase">Spontaneous Pocket</span>
            <div className="w-8 shrink-0" />
          </div>

          <div id="wallet_balance_card" className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-900 rounded-3xl p-6 relative overflow-hidden shadow-xl text-center space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-zinc-550 uppercase tracking-[0.25em]">SPONTANEOUS BALANCE</span>
              <h1 className="text-4xl font-display font-black text-white select-all">
                ₹{walletBalance.toLocaleString("en-IN")}
              </h1>
            </div>

            <div className="flex justify-center gap-3">
              <button
                id="add_money_btn"
                onClick={() => setShowDepositModal(true)}
                className="bg-zinc-100 hover:bg-white text-black font-semibold text-xs px-6 py-2.5 rounded-full transition-all shadow-md cursor-pointer"
              >
                Deposit Cash (UPI)
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[10.5px] font-display uppercase tracking-[0.15em] text-zinc-500 font-bold px-1 text-left">
              Active Plan Co-pays
            </h3>

            {(() => {
              const activePaidPlans = plans.filter(p => p.status !== "cancelled" && p.cost > 0 && p.joinedUsers.some(u => u.name === userProfile.name));
              if (activePaidPlans.length === 0) {
                return (
                  <p className="text-[10px] text-zinc-500 italic p-3 text-center bg-zinc-950 rounded-2xl border border-zinc-900">
                    No active plan co-pays yet. Join a plan with a ticket/shuffled split!
                  </p>
                );
              }
              return (
                <div className="space-y-2">
                  {activePaidPlans.map(p => (
                    <div key={p.id} className="bg-zinc-950 border border-zinc-900/60 rounded-2xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-lg shrink-0">⚡</span>
                        <div className="min-w-0 text-left">
                          <h4 className="text-xs font-sans font-bold text-zinc-200 truncate">{p.title}</h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[8.5px] text-emerald-400 font-mono font-bold uppercase">SOCIALLY SETTLED</span>
                            <span className="text-[8px] text-zinc-650">•</span>
                            <div className="flex -space-x-1">
                              {p.joinedUsers.slice(0, 3).map((u, ui) => (
                                <img key={ui} src={u.avatar} className="w-3.5 h-3.5 rounded-full object-cover border border-zinc-950" alt="avatar" />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="font-mono text-xs font-bold text-emerald-400 shrink-0">
                        ₹{p.cost}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10.5px] font-display uppercase tracking-[0.15em] text-zinc-500 font-bold">
                Spontaneous Peer Ledger
              </h3>
              <span className="text-[7.5px] font-mono text-[#ff8b66] bg-[#ff8b66]/10 px-2 py-0.5 rounded border border-[#ff8b66]/15 font-bold">
                Settle & Share History
              </span>
            </div>

            <div id="transactions_list" className="space-y-2 max-h-[190px] overflow-y-auto no-scrollbar">
              {transactions.map(tx => (
                <div key={tx.id} className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold font-mono text-sm leading-none ${tx.type === "credit" ? "bg-emerald-500/10 text-emerald-400 font-black" : "bg-[#ff5d41]/10 text-brand-peach"}`}>
                      {tx.type === "credit" ? "+" : "−"}
                    </div>
                    <div className="text-left">
                      <h4 className="text-xs font-sans font-semibold text-zinc-200">{tx.title}</h4>
                      <span className="text-[9px] font-mono text-zinc-550 block mt-0.5 uppercase">{tx.timestamp}</span>
                    </div>
                  </div>

                  <div className="font-mono text-xs font-bold text-zinc-200">
                    {tx.type === "credit" ? "+" : "−"} ₹{tx.amount}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DIRECT SUBMENU: PRIVACY & MAP indicators (4) */}
      {activeProfileSubView === "privacy" && (
        <div id="subview_privacy_rules" className="space-y-5 animate-slide-up text-left">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
            <button
              onClick={() => setActiveProfileSubView("settings")}
              className="text-zinc-500 hover:text-white flex items-center gap-1 text-[10px] uppercase font-mono font-bold"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Settings
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
              onClick={() => setActiveProfileSubView("settings")}
              className="text-zinc-500 hover:text-white flex items-center gap-1 text-[10px] uppercase font-mono font-bold"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Settings
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

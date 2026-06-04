import React, { useState } from 'react';
import { ArrowLeft, Edit, Save, Users, UserPlus, LogOut, CheckCircle, Info, Shield, MapPin, Compass } from "lucide-react";

export const CircleSettingsScreen = (props: any) => {
  const {
    circle,
    setCircles,
    setSelectedCircle,
    activeUserId,
    dbUsers,
    onBack, // goes back to Circle Detail
    onBackToCircles, // goes back to Circles List
    triggerToast
  } = props;

  const [name, setName] = useState(circle.name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");

  // Handle saving circle name update
  const handleSaveName = () => {
    if (!name.trim()) {
      triggerToast("Circle name cannot be empty!");
      return;
    }
    const updated = { ...circle, name: name.trim() };
    setCircles((prev: any[]) => prev.map(c => c.id === circle.id ? updated : c));
    setSelectedCircle(updated);
    setIsEditingName(false);
    triggerToast("Circle name updated successfully! ✏️");
  };

  // Filter available friends to invite
  const availableToInvite = dbUsers.filter((u: any) => {
    // Exclude current user and people who are already members
    const isSelf = u.user_id === activeUserId;
    const isAlreadyMember = circle.membersList?.some((m: any) => m.userId === u.user_id);
    const matchesSearch = u.full_name?.toLowerCase().includes(memberSearchQuery.toLowerCase()) || 
                          u.phone_number?.includes(memberSearchQuery);
    return !isSelf && !isAlreadyMember && matchesSearch;
  });

  // Invite buddy
  const handleInviteBuddy = (friend: any) => {
    const updatedMembersList = [
      ...(circle.membersList || []),
      { 
        userId: friend.user_id, 
        name: friend.full_name, 
        phone: friend.phone_number, 
        avatar: friend.profile_photo 
      }
    ];
    
    const updated = {
      ...circle,
      membersCount: updatedMembersList.length,
      avatars: updatedMembersList.slice(0, 5).map((m: any) => m.avatar),
      membersList: updatedMembersList
    };

    setCircles((prev: any[]) => prev.map(c => c.id === circle.id ? updated : c));
    setSelectedCircle(updated);
    triggerToast(`Added ${friend.full_name} to ${circle.name}! 👥`);
  };

  // Leave circle
  const handleLeaveCircle = () => {
    // Delete this circle from state to simulate leaving
    setCircles((prev: any[]) => prev.filter(c => c.id !== circle.id));
    setSelectedCircle(null);
    onBackToCircles();
    triggerToast(`Left ${circle.name}. You will no longer receive spontaneous co-pay invites.`);
  };

  return (
    <div id="circle_settings_pane" className="space-y-6 animate-slide-up text-left pb-16">
      
      {/* HEADER BREADCRUMB */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
        <button
          type="button"
          onClick={onBack}
          className="text-zinc-505 hover:text-white flex items-center gap-1.5 text-[10.5px] uppercase font-mono font-bold cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Circle Hub
        </button>
        <span className="text-[9.5px] font-mono text-[#ff8b66] font-bold uppercase tracking-widest">
          Group Node Console
        </span>
        <div className="w-8 shrink-0" />
      </div>

      {/* 1. GENERAL INFORMATION & EDIT NAME */}
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-955 border border-zinc-900 rounded-3xl p-5 space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-20 h-20 bg-[#ff8b66]/5 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center gap-3">
          <img
            src={circle.groupImage || circle.avatars?.[0] || "https://images.unsplash.com/photo-1543351611-58f69d7c1781?auto=format&fit=crop&q=80&w=200"}
            className="w-12 h-12 rounded-2xl object-cover border border-zinc-800"
            alt=""
            referrerPolicy="no-referrer"
          />
          <div className="flex-1 min-w-0">
            {isEditingName ? (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-zinc-950 border border-zinc-850 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none flex-1 min-w-0"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  className="p-2 bg-[#ff8b66] text-black hover:bg-[#ff9a7c] rounded-xl flex items-center justify-center shrink-0 cursor-pointer"
                  title="Save Name"
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
                  title="Rename Circle"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <span className="text-[9.5px] font-mono text-zinc-500 block mt-0.5 uppercase">
              Founded Circle Node • {circle.location}
            </span>
          </div>
        </div>

        {/* Basic specifications list */}
        <div className="pt-3 border-t border-zinc-950 space-y-2.5 text-xs">
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-550 font-mono text-[10px]">ANCHOR POINT:</span>
            <span className="text-zinc-300 font-semibold flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#ff8b66]" /> {circle.location}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-555 font-mono text-[10px]">CO-PLAY FORMAT:</span>
            <span className="text-zinc-300 font-semibold flex items-center gap-1">
              <Compass className="w-3 h-3 text-[#ff8b66]" /> {circle.format || "Any Spontaneous Meet"}
            </span>
          </div>
          <div className="flex justify-between items-start text-xs pt-1">
            <span className="text-zinc-555 font-mono text-[10px] shrink-0">BIO COORDINATE:</span>
            <span className="text-zinc-400 font-sans text-right leading-relaxed pl-4">
              {circle.description || "An active spontaneous group. Private invitations only."}
            </span>
          </div>
        </div>
      </div>

      {/* 2. MANAGE PERMISSIONS */}
      <div className="bg-zinc-900/30 border border-zinc-900 rounded-3xl p-5 space-y-4.5">
        <h3 className="text-[10px] font-display font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#ff8b66]" /> Group Permissions
        </h3>
        
        <div className="divide-y divide-zinc-950 text-xs">
          <div className="flex justify-between items-center py-2.5">
            <div>
              <h4 className="font-semibold text-zinc-200">Founder Authority</h4>
              <p className="text-[9.5px] text-zinc-500">Only founders can edit details & reassign coordinates</p>
            </div>
            <span className="text-[8.5px] font-mono text-emerald-400 bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-900/30 font-bold uppercase select-none">
              ACTIVE
            </span>
          </div>
          
          <div className="flex justify-between items-center py-2.5">
            <div>
              <h4 className="font-semibold text-zinc-200">Open Co-Play Hosting</h4>
              <p className="text-[9.5px] text-zinc-500">Allow any member inside circle to trigger co-pay meets</p>
            </div>
            <span className="text-[8.5px] font-mono text-emerald-400 bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-900/30 font-bold uppercase select-none">
              ENABLED
            </span>
          </div>
        </div>
      </div>

      {/* 3. INVITE NEW MEMBERS */}
      <div className="bg-zinc-900/30 border border-zinc-900 rounded-3xl p-5 space-y-4">
        <h3 className="text-[10px] font-display font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-[#ff8b66]" /> Invite Buddies Directly
        </h3>

        {/* Search bar input */}
        <input
          type="text"
          value={memberSearchQuery}
          onChange={(e) => setMemberSearchQuery(e.target.value)}
          placeholder="Search by friend name or number..."
          className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
        />

        <div className="space-y-2 max-h-40 overflow-y-auto pr-1 no-scrollbar pt-1">
          {availableToInvite.map((friend: any) => (
            <div 
              key={friend.user_id} 
              className="flex items-center justify-between p-2 bg-zinc-955/60 rounded-xl border border-zinc-900"
            >
              <div className="flex items-center gap-2 min-w-0">
                <img 
                  src={friend.profile_photo} 
                  className="w-5.5 h-5.5 rounded-full object-cover shrink-0" 
                  alt="" 
                  referrerPolicy="no-referrer" 
                />
                <div className="min-w-0">
                  <span className="text-[10.5px] font-bold text-zinc-200 block truncate">{friend.full_name}</span>
                  <span className="text-[8.5px] font-mono text-zinc-505 block truncate">{friend.phone_number}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleInviteBuddy(friend)}
                className="text-[8.5px] font-mono uppercase bg-zinc-900 text-brand-peach border border-zinc-800 px-2 rounded-md py-1 font-bold cursor-pointer hover:border-[#ff8b66] transition-colors"
              >
                Add Member
              </button>
            </div>
          ))}
          
          {memberSearchQuery !== "" && availableToInvite.length === 0 && (
            <span className="text-[10px] text-zinc-505 block text-center py-2">
              No matching friends found.
            </span>
          )}

          {memberSearchQuery === "" && availableToInvite.length === 0 && (
            <span className="text-[10px] text-zinc-550 block text-center py-2">
              All eligible buddies are already in this circle!
            </span>
          )}
        </div>
      </div>

      {/* 4. CURRENT CIRCLE MEMBERS DIRECTORY */}
      <div className="bg-zinc-905/30 border border-zinc-950 rounded-3xl p-5 space-y-4">
        <h3 className="text-[10px] font-display font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
          <Users className="w-4 h-4 text-[#ff8b66]" /> Group Directory ({circle.membersList?.length || 0})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto no-scrollbar">
          {circle.membersList?.map((m: any, idx: number) => (
            <div 
              key={idx} 
              className="flex items-center justify-between p-2 bg-zinc-950/60 rounded-xl border border-zinc-900"
            >
              <div className="flex items-center gap-2 min-w-0">
                <img 
                  src={m.avatar} 
                  className="w-5.5 h-5.5 rounded-full object-cover shrink-0" 
                  alt="" 
                  referrerPolicy="no-referrer" 
                />
                <div className="min-w-0">
                  <span className="text-[10.5px] font-bold text-zinc-250 truncate block leading-tight">{m.name}</span>
                  <span className="text-[8.5px] font-mono text-zinc-505 block">{m.phone}</span>
                </div>
              </div>
              <span className="text-[7.5px] font-mono uppercase bg-zinc-900 border border-zinc-800 px-1 py-0.5 rounded text-zinc-505 select-none font-bold">
                {idx === 0 ? "Founder" : "Member"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. LEAVE CIRCLE RED TRIGGER */}
      <div className="pt-2">
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
              <h4 className="text-xs font-semibold">Leave Spontaneous Circle</h4>
              <span className="text-[9.5px] font-mono text-[#ff8b66]/60 uppercase block mt-0.5">
                Sever co-pay updates & coordinate links
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#ff5d41]">
            Leave Group
          </span>
        </button>
      </div>

    </div>
  );
};

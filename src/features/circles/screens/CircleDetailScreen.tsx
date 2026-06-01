import React from 'react';
import { ArrowLeft, Settings, Users, Calendar, Clock, MapPin, CheckCircle, ChevronRight, MessageSquare } from "lucide-react";

export const CircleDetailScreen = (props: any) => {
  const {
    circle,
    plans,
    activeUserId,
    onBack,
    onOpenSettings,
    setSelectedPlan,
    setPaymentConfirmationPlan,
    handleToggleJoin,
    setActiveStoryRecap,
    setNewPlanCircleId,
    setNewPlanTitle,
    setSelectedPreset,
    setAudienceType,
    setSelectedCircleIds,
    setActiveTab,
    setCreateFlowStep,
    triggerToast
  } = props;

  // Filter plans belonging to this circle
  const circlePlans = plans.filter((p: any) => p.circleId === circle.id);

  // Sort plans chronologically (newest or upcoming first, we can do chronological order)
  const sortedPlans = [...circlePlans].sort((a: any, b: any) => {
    const dateA = new Date(a.date).getTime() || 0;
    const dateB = new Date(b.date).getTime() || 0;
    return dateA - dateB; // chronological order (oldest to newest)
  });

  return (
    <div id="circle_detail_pane" className="flex flex-col h-full space-y-4 animate-fade-in pb-12">
      
      {/* 1. CHAT-STYLE TOP HEADER */}
      <div 
        id="circle_detail_header" 
        className="flex items-center justify-between bg-zinc-950/80 border border-zinc-900 rounded-3xl p-3.5 backdrop-blur-md sticky top-0 z-20 shadow-lg"
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full transition-all cursor-pointer flex items-center justify-center"
            aria-label="Back to circles"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          {/* Header Info - Tapping opens Circle Settings */}
          <div 
            onClick={onOpenSettings}
            className="flex items-center gap-2.5 cursor-pointer group min-w-0"
            title="Open Circle Settings"
          >
            <img
              src={circle.groupImage || circle.avatars?.[0] || "https://images.unsplash.com/photo-1543351611-58f69d7c1781?auto=format&fit=crop&q=80&w=200"}
              className="w-10 h-10 rounded-xl object-cover border border-zinc-800 group-hover:border-[#ff8b66] transition-colors"
              alt=""
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0">
              <h3 className="text-sm font-display font-bold text-white tracking-tight truncate group-hover:text-[#ff8b66] transition-colors">
                {circle.name}
              </h3>
              <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1 mt-0.5">
                <Users className="w-3 h-3 text-[#ff8b66]/70" /> 
                {circle.membersCount || circle.membersList?.length || 0} members • Tap for settings
              </span>
            </div>
          </div>
        </div>

        {/* Right Gear Button */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="p-2 text-zinc-400 hover:text-white bg-zinc-900/60 border border-zinc-850 hover:border-zinc-700 rounded-full transition-all cursor-pointer flex items-center justify-center"
          title="Circle Settings"
        >
          <Settings className="w-4.5 h-4.5 text-zinc-400" />
        </button>
      </div>

      {/* 2. CHAT-STYLE ACTIVITIES FEED AREA */}
      <div 
        id="circle_chat_feed" 
        className="flex-1 space-y-5 overflow-y-auto no-scrollbar pr-1"
      >
        {/* Welcome message bubble */}
        <div className="flex items-start gap-2.5 max-w-[85%] select-none">
          <div className="w-6.5 h-6.5 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
            <span className="text-[10px]">🤖</span>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl rounded-tl-none p-3 text-[11px] text-zinc-450 leading-relaxed font-sans">
            Welcome to the activity hub for <span className="text-white font-semibold">{circle.name}</span>! 🎉
            <p className="mt-1">All co-pay plans, football tickets, and spontaneous meetups created within this circle stack here in chronological order.</p>
          </div>
        </div>

        {sortedPlans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 select-none">
            <div className="w-12 h-12 rounded-full bg-zinc-900/50 border border-zinc-850 flex items-center justify-center text-zinc-500">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-zinc-400 font-medium">No plans posted yet</p>
              <p className="text-[10.5px] text-zinc-505 max-w-[220px]">Post a co-pay plan or spontaneous meet to start the activity thread!</p>
            </div>
          </div>
        ) : (
          sortedPlans.map((plan: any) => {
            const isCompleted = plan.isHappened;
            const isAlreadyJoined = plan.joinedUsers?.some((u: any) => u.userId === activeUserId);
            
            return (
              <div 
                key={plan.id} 
                className="flex items-start gap-2.5 max-w-[95%] animate-slide-up"
              >
                {/* Host avatar acting as sender info */}
                <div 
                  className="w-7 h-7 rounded-full overflow-hidden border border-zinc-800 shrink-0 shadow-sm"
                  title={`Hosted by ${plan.creatorName || "Founder"}`}
                >
                  <img
                    src={plan.creatorAvatar || "https://api.dicebear.com/7.x/initials/svg?seed=Host"}
                    className="w-full h-full object-cover"
                    alt=""
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="space-y-1 flex-1 min-w-0">
                  {/* Sender Name & Timestamp info */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-[10px] font-bold text-zinc-350">{plan.creatorName || "Host"}</span>
                    <span className="text-[8px] font-mono text-zinc-650 uppercase">posted plan</span>
                  </div>

                  {/* Plan Attachment Bubble */}
                  <div 
                    className={`border rounded-2xl rounded-tl-none p-4 space-y-3.5 shadow-md ${
                      isCompleted 
                        ? "bg-[#09090b]/40 border-zinc-950 text-zinc-450" 
                        : "bg-zinc-900/60 border-zinc-850 text-zinc-205 hover:border-zinc-700 transition-colors"
                    }`}
                  >
                    {/* Header line */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className={`text-xs font-sans font-black uppercase tracking-wide truncate ${isCompleted ? "text-zinc-500" : "text-white"}`}>
                          {plan.title}
                        </h4>
                        
                        <div className="text-[10px] font-mono mt-1 space-y-0.5 text-zinc-500">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-[#ff8b66]" />
                            <span className={isCompleted ? "" : "text-zinc-350"}>{plan.date} • {plan.time}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-zinc-600" />
                            <span className="truncate">{plan.location}</span>
                          </div>
                        </div>
                      </div>

                      {/* Ticket price split */}
                      <div className="text-right shrink-0">
                        <span className={`text-[10.5px] font-black font-mono block ${isCompleted ? "text-zinc-500" : "text-zinc-200"}`}>
                          ₹{plan.cost}
                        </span>
                        <span className="text-[7.5px] font-mono text-zinc-600 uppercase tracking-wider block">Split/Head</span>
                      </div>
                    </div>

                    {/* Member Avatars & status */}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-950/60">
                      <div className="flex items-center gap-1.5">
                        <div className="flex -space-x-1.5">
                          {plan.joinedUsers?.filter((u: any) => u.joinState === "going" || u.joinState === "host").slice(0, 4).map((u: any, ui: number) => (
                            <img 
                              key={ui} 
                              src={u.avatar} 
                              className="w-4.5 h-4.5 rounded-full object-cover border border-zinc-950" 
                              alt="" 
                              referrerPolicy="no-referrer" 
                            />
                          ))}
                        </div>
                        <span className="text-[9px] text-zinc-500">
                          {plan.confirmedCount} joined {plan.maxSpots ? `(${plan.maxSpots - plan.confirmedCount} left)` : ""}
                        </span>
                      </div>

                      {/* Status indicator bubble */}
                      {isCompleted ? (
                        <span className="text-[7px] font-mono font-bold text-zinc-650 bg-zinc-950/50 border border-zinc-900 px-1.5 py-0.5 rounded uppercase leading-none tracking-wider">
                          Completed
                        </span>
                      ) : (
                        <span className="text-[7px] font-mono font-bold text-emerald-400 bg-emerald-950/20 px-1.5 py-0.5 rounded uppercase leading-none tracking-wider flex items-center gap-0.5">
                          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" /> Active
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-0.5">
                      {isCompleted ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setActiveStoryRecap(plan)}
                            className="flex-1 py-1.5 text-center border border-[#ff8b66]/20 hover:bg-[#ff8b66]/5 text-[#ff8b66] text-[10px] font-mono font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                          >
                            View Recap
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedPlan(plan)}
                            className="flex-1 py-1.5 text-center bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 text-zinc-500 text-[10px] font-mono font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                          >
                            Chat Archive
                          </button>
                        </>
                      ) : (
                        <>
                          {!isAlreadyJoined ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (plan.cost > 0) {
                                  setPaymentConfirmationPlan(plan);
                                } else {
                                  handleToggleJoin(plan);
                                  triggerToast(`Joined active coordination! ⚡`);
                                }
                              }}
                              className="flex-1 py-1.5 text-center bg-[#ff8b66] hover:bg-[#ff9a7c] text-black text-[10px] font-black uppercase tracking-wider rounded-lg transition-all shadow cursor-pointer"
                            >
                              Join Plan
                            </button>
                          ) : (
                            <button
                              disabled
                              className="flex-1 py-1.5 text-center bg-zinc-950 border border-zinc-900 text-[#ff8b66] text-[10px] font-bold uppercase rounded-lg"
                            >
                              Joined
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedPlan(plan)}
                            className="flex-1 py-1.5 text-center bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] font-bold uppercase tracking-wider hover:bg-zinc-850 rounded-lg transition-colors cursor-pointer"
                          >
                            Open Chat
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. FLOAT HOSTER CONTROL PANEL */}
      <div 
        id="circle_detail_footer_controls" 
        className="shrink-0 flex items-center justify-between gap-3 bg-zinc-950/80 border border-zinc-900 p-2.5 rounded-2xl backdrop-blur-md select-none"
      >
        <div className="flex flex-col text-left px-1">
          <span className="text-[8px] font-mono text-zinc-550 uppercase tracking-widest font-extrabold">Instant Meet</span>
          <span className="text-[10px] text-zinc-400 font-sans">Ready to host with this circle?</span>
        </div>
        
        <button
          type="button"
          onClick={() => {
            setNewPlanCircleId(circle.id);
            setNewPlanTitle(`Meetup with ${circle.name}`);
            setSelectedPreset("custom");
            setAudienceType("circle");
            setSelectedCircleIds([circle.id]);
            setActiveTab("create");
            setCreateFlowStep("DETAILS");
            triggerToast(`Fast Hosted: target ${circle.name}`);
          }}
          className="bg-[#ff8b66] hover:bg-[#ff9a7c] text-black text-[10px] font-black uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
        >
          Host New Plan
        </button>
      </div>

    </div>
  );
};

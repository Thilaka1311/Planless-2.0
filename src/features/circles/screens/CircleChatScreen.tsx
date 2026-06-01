import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Settings, Users, Send, Image, Plus, Calendar, MapPin, Clock } from "lucide-react";

export const CircleChatScreen = (props: any) => {
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
    triggerToast
  } = props;

  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<any[]>([
    {
      id: "m1",
      senderId: "system",
      senderName: "Planless Bot",
      avatar: "",
      text: `Welcome to the private coordinate channel for ${circle.name}! All upcoming turf bookings, book clubs, and split co-pay dinners created here automatically stack in the timeline as active chat cards.`,
      timestamp: "10:00 AM",
      isSystem: true
    },
    {
      id: "m2",
      senderId: "U002",
      senderName: "Keval",
      avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Keval",
      text: "Yo team! Just posted the turf booking for this Saturday. Let's get the numbers sorted early.",
      timestamp: "10:05 AM",
      isSystem: false
    }
  ]);

  const timelineEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when a message is added
  useEffect(() => {
    timelineEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending a mock message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    const newMessage = {
      id: `m_${Date.now()}`,
      senderId: activeUserId,
      senderName: "You",
      avatar: "https://api.dicebear.com/7.x/initials/svg?seed=You",
      text: messageText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: false
    };

    setMessages(prev => [...prev, newMessage]);
    setMessageText("");
    triggerToast("Message sent! (Mock active) 💬");
  };

  // Filter plans belonging to this circle
  const circlePlans = plans.filter((p: any) => p.circleId === circle.id);

  // Sort plans chronologically (oldest first for a timeline view)
  const sortedPlans = [...circlePlans].sort((a: any, b: any) => {
    const dateA = new Date(a.date).getTime() || 0;
    const dateB = new Date(b.date).getTime() || 0;
    return dateA - dateB;
  });

  return (
    <div id="circle_chat_container" className="flex flex-col h-[calc(100vh-140px)] space-y-3 animate-fade-in pb-1">
      
      {/* 1. INTERACTIVE CHAT HEADER */}
      <div 
        id="circle_chat_header" 
        className="flex items-center justify-between bg-zinc-950/80 border border-zinc-900 rounded-3xl p-3 backdrop-blur-md shrink-0 shadow-lg select-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full transition-all cursor-pointer flex items-center justify-center"
            aria-label="Back to circles list"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          {/* Header Info - Clickable to Settings */}
          <div 
            onClick={onOpenSettings}
            className="flex items-center gap-2 cursor-pointer group min-w-0"
            title="Open Group Settings"
          >
            <img
              src={circle.groupImage || circle.avatars?.[0] || "https://images.unsplash.com/photo-1543351611-58f69d7c1781?auto=format&fit=crop&q=80&w=200"}
              className="w-9 h-9 rounded-xl object-cover border border-zinc-800 group-hover:border-[#ff8b66] transition-colors"
              alt=""
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0">
              <h3 className="text-xs font-display font-bold text-white tracking-tight truncate group-hover:text-[#ff8b66] transition-colors">
                {circle.name}
              </h3>
              <span className="text-[9px] text-zinc-500 font-mono flex items-center gap-1 mt-0.5">
                <Users className="w-2.5 h-2.5 text-[#ff8b66]" /> 
                {circle.membersCount || circle.membersList?.length || 0} members • Settings
              </span>
            </div>
          </div>
        </div>

        {/* Right Settings Gear shortcut */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="p-2 text-zinc-400 hover:text-white bg-zinc-900/60 border border-zinc-850 hover:border-zinc-750 rounded-full transition-all cursor-pointer flex items-center justify-center"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* 2. CHAT TIMELINE (MESSAGES + COMPACT PLAN CARDS) */}
      <div 
        id="circle_chat_timeline" 
        className="flex-1 space-y-4 overflow-y-auto no-scrollbar pr-1 py-1"
      >
        {/* Render Chat Messages and Interspersed Plan Cards in Chronological order */}
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex gap-2.5 max-w-[85%] ${
              msg.senderId === activeUserId ? "ml-auto flex-row-reverse" : ""
            }`}
          >
            {!msg.isSystem && (
              <img
                src={msg.avatar}
                className="w-6.5 h-6.5 rounded-full object-cover shrink-0 border border-zinc-850 shadow-sm"
                alt=""
                referrerPolicy="no-referrer"
              />
            )}
            
            <div className="space-y-0.5">
              {!msg.isSystem && msg.senderId !== activeUserId && (
                <span className="text-[9.5px] font-bold text-zinc-450 block ml-1">{msg.senderName}</span>
              )}
              
              <div 
                className={`p-3 text-[11px] leading-relaxed font-sans rounded-2xl ${
                  msg.isSystem 
                    ? "bg-zinc-900/30 border border-zinc-910 text-zinc-500 rounded-tl-none" 
                    : msg.senderId === activeUserId 
                      ? "bg-[#ff8b66] text-black font-semibold rounded-tr-none" 
                      : "bg-zinc-900 border border-zinc-850 text-zinc-300 rounded-tl-none"
                }`}
              >
                {msg.text}
                <span 
                  className={`text-[7px] font-mono block mt-1 text-right leading-none ${
                    msg.senderId === activeUserId ? "text-black/60" : "text-zinc-650"
                  }`}
                >
                  {msg.timestamp}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* 3. TIMELINE SEPARATOR FOR SHARED PLANS */}
        <div className="flex items-center gap-3 select-none">
          <div className="flex-1 h-[1px] bg-zinc-900" />
          <span className="text-[8px] font-mono text-zinc-550 uppercase tracking-widest font-extrabold">Shared Group Plans</span>
          <div className="flex-1 h-[1px] bg-zinc-900" />
        </div>

        {/* Render Plan event Cards chronologically */}
        {sortedPlans.map((plan: any) => {
          const isCompleted = plan.isHappened;
          const isAlreadyJoined = plan.joinedUsers?.some((u: any) => u.userId === activeUserId);

          return (
            <div 
              key={plan.id}
              className="flex items-start gap-2.5 max-w-[95%] animate-slide-up"
            >
              <img
                src={plan.creatorAvatar || "https://api.dicebear.com/7.x/initials/svg?seed=Host"}
                className="w-6.5 h-6.5 rounded-full object-cover shrink-0 border border-zinc-850"
                alt=""
                referrerPolicy="no-referrer"
              />
              
              <div className="flex-1 space-y-1 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[9.5px] font-bold text-zinc-400">{plan.creatorName || "Founder"}</span>
                  <span className="text-[7.5px] font-mono text-zinc-600 uppercase">shared co-pay event</span>
                </div>

                {/* Plan card inside the timeline */}
                <div 
                  className={`border rounded-2xl rounded-tl-none p-3.5 space-y-3 ${
                    isCompleted 
                      ? "bg-zinc-950/45 border-zinc-910 text-zinc-500" 
                      : "bg-zinc-900/60 border-zinc-850 text-zinc-200 hover:border-zinc-750 transition-colors"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className={`text-[11.5px] font-sans font-black uppercase tracking-wide truncate ${isCompleted ? "text-zinc-550" : "text-white"}`}>
                        {plan.title}
                      </h4>
                      <div className="text-[9.5px] font-mono mt-1 space-y-0.5 text-zinc-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-[#ff8b66]" />
                          <span className={isCompleted ? "" : "text-zinc-300"}>{plan.date} • {plan.time}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-zinc-650" />
                          <span className="truncate">{plan.location}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-[10px] font-black font-mono block ${isCompleted ? "text-zinc-550" : "text-zinc-200"}`}>
                        ₹{plan.cost}
                      </span>
                      <span className="text-[7px] font-mono text-zinc-600 uppercase block tracking-wider">Split/Head</span>
                    </div>
                  </div>

                  {/* Footing Avatars & Buttons */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-zinc-950/60 text-[9px] text-zinc-505">
                    <div className="flex items-center gap-1">
                      <div className="flex -space-x-1.5">
                        {plan.joinedUsers?.filter((u: any) => u.joinState === "going" || u.joinState === "host").slice(0, 3).map((u: any, ui: number) => (
                          <img key={ui} src={u.avatar} className="w-4 h-4 rounded-full object-cover border border-zinc-950" alt="" referrerPolicy="no-referrer" />
                        ))}
                      </div>
                      <span>{plan.confirmedCount || 0} joined ({plan.maxSpots ? `${plan.maxSpots - (plan.confirmedCount || 0)} left` : ""})</span>
                    </div>

                    {isCompleted ? (
                      <span className="text-[7px] font-mono bg-zinc-950/70 text-zinc-600 px-1 rounded border border-zinc-900 font-bold uppercase">Completed</span>
                    ) : (
                      <span className="text-[7px] font-mono bg-emerald-950/30 text-emerald-400 px-1 rounded border border-emerald-900/30 font-bold uppercase">Active</span>
                    )}
                  </div>

                  <div className="flex gap-2 pt-0.5">
                    {isCompleted ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setActiveStoryRecap(plan)}
                          className="flex-1 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-[#ff8b66] text-[9.5px] font-mono font-bold uppercase tracking-wider rounded-lg cursor-pointer"
                        >
                          View Recap
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedPlan(plan)}
                          className="flex-1 py-1.5 bg-zinc-950 border border-zinc-900 text-zinc-500 text-[9.5px] font-mono font-semibold uppercase tracking-wider rounded-lg cursor-pointer"
                        >
                          Archive
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
                                triggerToast("Joined active coordination! ⚡");
                              }
                            }}
                            className="flex-1 py-1.5 bg-[#ff8b66] hover:bg-[#ff9a7c] text-black text-[9.5px] font-black uppercase tracking-wider rounded-lg cursor-pointer shadow"
                          >
                            Join Plan
                          </button>
                        ) : (
                          <button
                            disabled
                            className="flex-1 py-1.5 bg-zinc-950 border border-zinc-900 text-[#ff8b66] text-[9.5px] font-bold uppercase rounded-lg"
                          >
                            Joined
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedPlan(plan)}
                          className="flex-1 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 text-[9.5px] font-bold uppercase tracking-wider hover:bg-zinc-850 rounded-lg cursor-pointer"
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
        })}

        <div ref={timelineEndRef} />
      </div>

      {/* 3. INTERACTIVE CHAT COMPOSER BAR AT THE BOTTOM */}
      <form 
        onSubmit={handleSendMessage}
        className="shrink-0 flex items-center gap-2 bg-zinc-950/70 border border-zinc-900 p-2 rounded-2xl backdrop-blur-md shadow-2xl select-none"
      >
        <button
          type="button"
          onClick={() => triggerToast("Direct photo sharing mock active! 📷")}
          className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer shrink-0 active:scale-95"
          title="Share Coordinate Photo"
        >
          <Image className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder={`Type message to ${circle.name}...`}
          className="flex-1 bg-zinc-900/60 border border-zinc-850 focus:border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-550 focus:outline-none min-w-0"
        />

        <button
          type="submit"
          className="w-9 h-9 rounded-xl bg-[#ff8b66] text-black hover:bg-[#ff9a7c] flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-95 shadow-md"
          title="Send Message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
};

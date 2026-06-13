import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Settings,
  Users,
  ChevronRight,
  Plus,
  Send,
  AlertCircle,
  MessageSquare
} from "lucide-react";
import { usePlansStore } from "../../../features/plans/state/PlansContext";
import { useProfileStore } from "../../../features/profile/state/ProfileContext";
import { useChatStore } from "../../../features/chat/state/ChatContext";
import { Plan } from "../../../core/types";

// ActiveThread type as specified in the requirements
type ActiveThread =
  | null
  | { type: "general" }
  | { type: "plan"; plan: Plan };

export const CircleChatScreen = (props: any) => {
  const {
    circle,
    activeUserId,
    onBack,
    onOpenSettings,
    triggerToast,
    setSelectedPlan,
    // Create plan navigation
    setNewPlanCircleId,
    setNewPlanTitle,
    setSelectedPreset,
    setAudienceType,
    setSelectedCircleIds,
    setActiveTab,
    setCreateFlowStep,
  } = props;

  const { plans, refreshPlans } = usePlansStore();
  const { activeUserUuid } = useProfileStore();
  const resolvedUuid = activeUserUuid || activeUserId;

  // Chat Context integration
  const {
    messages,
    isLoading: isChatLoading,
    connectionStatus,
    setActiveRoom,
    sendMessage,
    unreadCounts,
    markThreadRead
  } = useChatStore();

  // Screen state
  const [activeThread, setActiveThread] = useState<ActiveThread>(null);
  const [archivedExpanded, setArchivedExpanded] = useState(false);
  const [inputText, setInputText] = useState("");
  const [allCircleMessages, setAllCircleMessages] = useState<any[]>([]);

  const circleUuid = circle.dbUuid || circle.id;

  // Synchronize activeThread with activePlanId from ChatContext (for external navigation triggers)
  const chatStore = useChatStore();
  const currentChatPlanId = chatStore.activePlanId;

  // Sync active room in ChatContext with activeThread state
  useEffect(() => {
    if (activeThread === null) {
      if (!currentChatPlanId) {
        setActiveRoom(null, null);
      }
    } else if (activeThread.type === "general") {
      setActiveRoom(circleUuid, null);
    } else if (activeThread.type === "plan") {
      setActiveRoom(circleUuid, activeThread.plan.dbUuid);
    }
  }, [activeThread, circleUuid, setActiveRoom, currentChatPlanId]);

  // Mark thread as read when entering the thread view
  useEffect(() => {
    if (activeThread !== null) {
      const pId = activeThread.type === "plan" ? activeThread.plan.dbUuid : null;
      markThreadRead(circleUuid, pId);
    }
  }, [activeThread, circleUuid, markThreadRead]);

  useEffect(() => {
    if (currentChatPlanId) {
      const matchedPlan = plans.find(p => p.dbUuid === currentChatPlanId || p.id === currentChatPlanId);
      if (matchedPlan) {
        setActiveThread({ type: "plan", plan: matchedPlan });
      } else {
        // Missing thread handling: create context automatically and show empty discussion thread
        const mockPlan: Plan = {
          id: currentChatPlanId,
          dbUuid: currentChatPlanId,
          title: "Discussion Thread",
          groupId: circleUuid,
          circleId: circleUuid,
          hostId: "",
          members: [],
          capacity: 10,
          date: "",
          time: "",
          location: "",
          paymentAmount: 0,
          status: "active",
          datetime: "",
          createdAt: "",
          coverImage: "",
          creatorId: "",
          creatorName: "Host",
          creatorAvatar: "",
          joinedUsers: [],
          timeline: "today",
          seatsLeft: 10,
          category: "custom",
          cost: 0,
          confirmedCount: 0
        };
        setActiveThread({ type: "plan", plan: mockPlan });
      }
    }
  }, [currentChatPlanId, plans, circleUuid]);

  // Load plans belonging to the circle
  useEffect(() => {
    async function loadLatest() {
      try {
        await refreshPlans();
      } catch (err) {
        console.error("[CircleChatScreen] Failed to refresh plans:", err);
      }
    }
    loadLatest();
  }, [circleUuid]);

  // Fetch all circle messages to build previews & last message timestamps
  const fetchPreviews = async () => {
    if (!circleUuid || !activeUserId) return;
    const url = `/api/db/chat/messages?circle_id=${circleUuid}&user_id=${activeUserId}`;
    try {
      console.log(`[CircleChatScreen Previews] Fetching preview url: ${url}`);
      const res = await fetch(url);
      
      console.log(`[CircleChatScreen Previews] Response status: ${res.status}`);
      const contentType = res.headers.get("content-type") || "";
      console.log(`[CircleChatScreen Previews] Response Content-Type: ${contentType}`);

      if (!res.ok) {
        console.warn(`[CircleChatScreen] Failed to fetch previews. Status: ${res.status}`);
        return;
      }

      if (!contentType.includes("application/json")) {
        console.warn(`[CircleChatScreen] Received non-JSON response from previews fetch:`, contentType);
        return;
      }

      const json = await res.json();
      setAllCircleMessages(json.data || []);
    } catch (err) {
      console.error("[CircleChatScreen] Failed to fetch previews:", err);
    }
  };

  useEffect(() => {
    fetchPreviews();
    const interval = setInterval(fetchPreviews, 5000);
    return () => clearInterval(interval);
  }, [circleUuid, activeUserId]);

  useEffect(() => {
    fetchPreviews();
  }, [messages.length]);

  // Filter plans by circle
  const circlePlans = plans.filter((p: any) => {
    return p.circleId === circleUuid || p.groupId === circleUuid;
  });

  // Thread Visibility Filter: Host, Going, and Waitlisted users can see plan threads. Non-participants cannot.
  const isParticipantOfPlan = (plan: Plan) => {
    const isHost = plan.hostId === resolvedUuid || plan.creatorId === resolvedUuid;
    const isJoined = plan.joinedUsers?.some(
      (u: any) => u.userId === resolvedUuid && (u.joinState === "going" || u.joinState === "waitlist")
    );
    return isHost || isJoined;
  };

  const visiblePlans = circlePlans.filter(isParticipantOfPlan);

  // Group plans by active and archived
  const activePlans = visiblePlans.filter(
    (p: Plan) => p.status !== "completed" && p.status !== "cancelled"
  );
  const archivedPlans = visiblePlans.filter(
    (p: Plan) => p.status === "completed" || p.status === "cancelled"
  );

  // Emojis based on plan categories
  const getPlanEmoji = (plan: Plan) => {
    const cat = (plan.category || "").toLowerCase();
    const title = (plan.title || "").toLowerCase();
    if (cat.includes("badminton") || title.includes("badminton")) return "🏸";
    if (cat.includes("football") || cat.includes("sports") || title.includes("football") || title.includes("soccer")) return "⚽";
    if (cat.includes("movie") || cat.includes("film") || title.includes("movie")) return "🎬";
    if (cat.includes("dining") || cat.includes("restaurant") || cat.includes("brunch") || title.includes("food") || title.includes("restaurant")) return "🍔";
    return "📅";
  };

  // Sort Active Plan Threads:
  // 1. Most recently messaged thread first
  // 2. If no messages exist, newest plan first
  const getPlanLastMessageTime = (plan: Plan) => {
    const planMsgs = allCircleMessages.filter((m) => m.plan_id === plan.dbUuid);
    if (planMsgs.length > 0) {
      return new Date(planMsgs[0].created_at).getTime();
    }
    return new Date(plan.createdAt || plan.datetime).getTime();
  };

  const sortedActivePlans = [...activePlans].sort((a, b) => {
    return getPlanLastMessageTime(b) - getPlanLastMessageTime(a);
  });

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return "";
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  // Composer authorization checks
  const getComposerState = (thread: ActiveThread) => {
    if (!thread) return { canSend: false, banner: null };
    if (thread.type === "general") {
      return { canSend: true, banner: null };
    }

    const plan = thread.plan;
    if (plan.status === "completed") {
      return { canSend: false, banner: "This thread is archived." };
    }
    if (plan.status === "cancelled") {
      return { canSend: false, banner: "This plan was cancelled." };
    }

    const isHost = plan.hostId === resolvedUuid || plan.creatorId === resolvedUuid;
    const myMemberObj = plan.joinedUsers?.find((u: any) => u.userId === resolvedUuid);
    const isGoing = myMemberObj?.joinState === "going";
    const isWaitlist = myMemberObj?.joinState === "waitlist";

    if (isHost || isGoing) {
      return { canSend: true, banner: null };
    }
    if (isWaitlist) {
      return {
        canSend: false,
        banner: "You are currently waitlisted. You can follow the conversation but cannot send messages."
      };
    }
    return { canSend: false, banner: "You are not participating in this plan." };
  };

  const composerState = getComposerState(activeThread);

  // Send message handler
  const handleSend = async () => {
    if (!inputText.trim()) return;
    try {
      await sendMessage(inputText.trim());
      setInputText("");
    } catch (err) {
      console.error("[CircleChatScreen] Failed to send message:", err);
    }
  };

  // Scroll timeline to bottom
  const messageEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, activeThread]);

  // Handle plan hosting navigation
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

  // Filter local messages for thread isolation rendering
  const filteredMessages = messages.filter((msg) => {
    if (activeThread?.type === "general") {
      return !msg.planId;
    } else if (activeThread?.type === "plan") {
      return msg.planId === activeThread.plan.dbUuid;
    }
    return false;
  });

  // Extract preview data for general chat card
  const generalMessages = allCircleMessages.filter((m) => !m.plan_id);
  const lastGeneralMsg = generalMessages[0]; // newest since API returns DESC

  // Helpers for text truncation and timestamps
  const truncate = (str: string, len: number) => {
    if (!str) return "";
    return str.length > len ? str.slice(0, len) + "..." : str;
  };

  const isDev = (import.meta as any).env?.DEV || true;
  const generalKey = `general:${circleUuid}`;
  const genUnread = unreadCounts[generalKey] || 0;

  return (
    <div className="flex flex-col h-full bg-[#0C0C0E] text-zinc-100 select-none animate-fade-in px-4 py-2">
      {/* ── CASE 1: COMMUNICATION HUB (activeThread === null) ────────────────────────── */}
      {activeThread === null && (
        <div className="flex flex-col h-full justify-between">
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between pt-4 pb-6">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onBack}
                className="w-10 h-10 bg-zinc-900/60 border border-zinc-850 hover:bg-zinc-800 rounded-full flex items-center justify-center transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-zinc-400 hover:text-white" />
              </button>
              <div>
                <h3 className="text-xl font-display font-black text-white tracking-tight uppercase">
                  {circle.name}
                </h3>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {circle.membersCount || circle.membersList?.length || 0} members
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Realtime Status Indicator */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-850">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    connectionStatus === "Connected"
                      ? "bg-emerald-500"
                      : connectionStatus === "Reconnecting"
                      ? "bg-amber-500 animate-pulse"
                      : "bg-zinc-500"
                  }`}
                />
                <span className="text-[8px] font-mono font-bold text-zinc-400">
                  {connectionStatus}
                </span>
              </div>
              <button
                type="button"
                onClick={onOpenSettings}
                className="w-10 h-10 bg-zinc-900/60 border border-zinc-850 hover:bg-zinc-800 rounded-full flex items-center justify-center transition-all cursor-pointer"
              >
                <Settings className="w-4 h-4 text-zinc-400 hover:text-white" />
              </button>
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-6">
            {/* GENERAL CHAT CARD */}
            <div
              onClick={() => setActiveThread({ type: "general" })}
              className="bg-zinc-900/60 border border-zinc-850 p-4.5 rounded-2xl flex items-center justify-between cursor-pointer hover:border-zinc-750 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">💬</span>
                <span className="text-sm font-bold text-[#ff8b66]">General Chat</span>
              </div>
              <div className="flex items-center gap-2">
                {genUnread > 0 && (
                  <span className="text-xs font-bold text-[#ff8b66] flex items-center gap-1 font-mono">
                    ● {genUnread}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-zinc-500" />
              </div>
            </div>

            {/* ACTIVE PLAN THREADS */}
            <div>
              <span className="text-[10px] font-sans font-black uppercase tracking-wider text-zinc-500 block mb-3">
                ACTIVE PLANS
              </span>
              {sortedActivePlans.length === 0 ? (
                <div className="py-6 text-center text-zinc-550 text-[10px] font-mono">
                  No active plans.
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedActivePlans.map((plan) => {
                    const planKey = `plan:${plan.dbUuid}`;
                    const planUnread = unreadCounts[planKey] || 0;
                    return (
                      <div
                        key={plan.id}
                        onClick={() => setActiveThread({ type: "plan", plan })}
                        className="bg-zinc-900/60 border border-zinc-850 p-4.5 rounded-2xl flex items-center justify-between cursor-pointer hover:border-zinc-750 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{getPlanEmoji(plan)}</span>
                          <span className="text-sm font-bold text-white">{plan.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {planUnread > 0 && (
                            <span className="text-xs font-bold text-[#ff8b66] flex items-center gap-1 font-mono">
                              ● {planUnread}
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4 text-zinc-550" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* COLLAPSIBLE ARCHIVED THREADS */}
            {archivedPlans.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setArchivedExpanded(!archivedExpanded)}
                  className="w-full flex items-center justify-between py-2 text-[10px] font-sans font-black uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
                >
                  <span>Archived Threads ({archivedPlans.length})</span>
                  <ChevronRight className={`w-3.5 h-3.5 transform transition-transform ${archivedExpanded ? "rotate-90" : ""}`} />
                </button>

                {archivedExpanded && (
                  <div className="space-y-2.5 mt-2">
                    {archivedPlans.map((plan) => (
                      <div
                        key={plan.id}
                        onClick={() => setActiveThread({ type: "plan", plan })}
                        className="bg-zinc-950/40 border border-zinc-900 p-3.5 rounded-xl flex items-center justify-between cursor-pointer hover:border-zinc-800 transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm opacity-60">{getPlanEmoji(plan)}</span>
                          <span className="text-xs font-bold text-zinc-400">{plan.title}</span>
                        </div>
                        <span className="text-[8px] font-mono bg-zinc-900 text-zinc-500 border border-zinc-850 px-1.5 py-0.5 rounded uppercase">
                          {plan.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Create Plan CTA */}
          <div className="shrink-0 pt-4 pb-4">
            <button
              type="button"
              onClick={handleHostPlan}
              className="w-full py-4 border border-dashed border-[#ff8b66]/30 hover:border-[#ff8b66]/60 text-[#ff8b66] font-sans font-black text-xs tracking-widest uppercase rounded-2xl flex items-center justify-center gap-1.5 transition-all hover:bg-zinc-900/30 cursor-pointer"
            >
              <Plus className="w-4.5 h-4.5" />
              <span>CREATE PLAN</span>
            </button>
          </div>
        </div>
      )}

      {/* ── CASE 2: THREAD MESSAGE MODE (activeThread !== null) ────────────────────── */}
      {activeThread !== null && (
        <div className="flex flex-col h-full">
          {/* Header */}
          {activeThread.type === "general" ? (
            <div className="shrink-0 flex items-center gap-4 pt-4 pb-6">
              <button
                type="button"
                onClick={() => setActiveThread(null)}
                className="w-10 h-10 bg-zinc-900/60 border border-zinc-850 hover:bg-zinc-800 rounded-full flex items-center justify-center transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-zinc-400 hover:text-white" />
              </button>
              <div>
                <h3 className="text-lg font-display font-black text-white tracking-tight uppercase leading-tight">
                  General Chat
                </h3>
                <span className="text-[9.5px] font-sans font-black tracking-widest text-[#ff8b66] uppercase block mt-0.5">
                  CIRCLE CHAT
                </span>
              </div>
            </div>
          ) : (
            /* Compact Hero Header for Plan Threads */
            <div className="relative w-full overflow-hidden rounded-3xl border border-zinc-900 bg-zinc-950 shrink-0 mb-3" style={{ height: "200px" }}>
              {/* Banner Image */}
              <img
                src={activeThread.plan.coverImage || "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=600"}
                className="absolute inset-0 w-full h-full object-cover"
                alt=""
              />
              {/* Dark Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0C0C0E] via-[#0C0C0E]/60 to-transparent" />
              
              {/* Content Container */}
              <div className="absolute inset-0 p-4 flex flex-col justify-between">
                {/* Top Row: Back button + View Plan Button */}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveThread(null)}
                    className="w-8 h-8 bg-zinc-950/60 border border-zinc-850 hover:bg-zinc-800 rounded-full flex items-center justify-center transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 text-zinc-300" />
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setSelectedPlan?.(activeThread.plan)}
                    className="px-3 py-1.5 bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-850 rounded-xl text-[9px] font-mono font-bold tracking-wider text-[#ff8b66] uppercase cursor-pointer flex items-center gap-1.5 transition-all"
                  >
                    <span>📋</span> VIEW PLAN
                  </button>
                </div>

                {/* Bottom Details Row */}
                <div className="space-y-1 text-left">
                  <span className="inline-block text-[8px] font-mono font-black tracking-widest text-[#ff8b66] uppercase bg-[#ff8b66]/10 px-2 py-0.5 rounded border border-[#ff8b66]/20">
                    [{circle.name.toUpperCase()}]
                  </span>
                  <h3 className="text-base font-display font-black text-white uppercase tracking-tight leading-tight">
                    {activeThread.plan.title}
                  </h3>
                  <p className="text-[10px] text-zinc-400">
                    Hosted by <span className="text-zinc-200 font-semibold">{activeThread.plan.creatorName || "Host"}</span>
                  </p>
                  
                  {/* Quick metadata row */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[9.5px] font-mono text-zinc-400">
                    <span className="flex items-center gap-1">📍 {truncate(activeThread.plan.location, 20)}</span>
                    <span className="flex items-center gap-1">🕒 {activeThread.plan.date} • {activeThread.plan.time}</span>
                    <span className="flex items-center gap-1 text-emerald-400">👥 {activeThread.plan.confirmedCount || 0} Going</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto no-scrollbar py-3 space-y-4">
            {/* ONLY render beginning log for General Chat */}
            {activeThread.type === "general" && (
              <div className="flex justify-center text-center px-4 py-2 border-b border-zinc-950/40 pb-4">
                <span className="text-[9px] font-sans font-black tracking-wider text-zinc-600 uppercase">
                  BEGINNING OF SECURE THREAD WORKSPACE
                </span>
              </div>
            )}

            {isChatLoading ? (
              <div className="flex justify-center py-6 text-zinc-500 text-[10px] font-mono uppercase tracking-wider">
                Loading messages...
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500">
                <MessageSquare className="w-8 h-8 text-zinc-700 mb-2" />
                <p className="text-[11px] font-bold text-zinc-400">
                  {activeThread.type === "general" ? "Start the conversation." : "No messages yet."}
                </p>
                {activeThread.type !== "general" && (
                  <p className="text-[9px] text-zinc-650 max-w-[200px] mt-1">
                    Coordinate with your group here.
                  </p>
                )}
              </div>
            ) : (
              filteredMessages.map((msg) => {
                if (msg.type === "system") {
                  return (
                    <div key={msg.id} className="flex items-center justify-center gap-2 py-2 w-full px-4">
                      <div className="h-[1px] bg-zinc-800 grow"></div>
                      <span className="text-[10px] text-zinc-500 font-medium px-2 text-center">
                        {msg.content}
                      </span>
                      <div className="h-[1px] bg-zinc-800 grow"></div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 max-w-[85%] ${
                      msg.isOwn ? "ml-auto flex-row-reverse" : "mr-auto"
                    }`}
                  >
                    {/* Avatar */}
                    <img
                      src={
                        msg.sender?.avatar ||
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100"
                      }
                      className="w-8 h-8 rounded-full object-cover border border-zinc-900 shrink-0"
                      alt=""
                      referrerPolicy="no-referrer"
                    />

                    {/* Bubble Content */}
                    <div className={`flex flex-col ${msg.isOwn ? "items-end" : "items-start"}`}>
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[10px] font-bold text-zinc-400">
                          {msg.sender?.name || "Member"}
                        </span>
                        <span className="text-[8px] font-mono text-zinc-550">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                      <div
                        className={`px-4 py-3 rounded-2xl text-xs break-words leading-relaxed ${
                          msg.isOwn
                            ? "bg-[#ff8b66] text-black font-semibold rounded-tr-none"
                            : "bg-zinc-900 text-zinc-200 rounded-tl-none border border-zinc-850"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messageEndRef} />
          </div>

          {/* Composer Rules Banner & Message Input */}
          <div className="shrink-0 pt-3 border-t border-zinc-900 bg-zinc-950/60 pb-4">
            {!composerState.canSend && composerState.banner && (
              <div className="flex items-center gap-2 mb-3 p-3 rounded-xl bg-zinc-900 border border-zinc-850">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-[10px] text-zinc-400 font-mono">
                  {composerState.banner}
                </span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <input
                type="text"
                disabled={!composerState.canSend}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend();
                }}
                placeholder={
                  composerState.canSend
                    ? activeThread.type === "general"
                      ? "Message general..."
                      : "Coordinate active plan..."
                    : "Messaging disabled"
                }
                className={`flex-1 h-11 rounded-full px-4 text-xs bg-zinc-900 border text-zinc-200 placeholder-zinc-550 focus:outline-none focus:border-[#ff8b66]/60 ${
                  !composerState.canSend ? "opacity-50 cursor-not-allowed border-zinc-850" : "border-zinc-800"
                }`}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!composerState.canSend || !inputText.trim()}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                  composerState.canSend && inputText.trim()
                    ? "bg-[#ff8b66] hover:bg-[#ff9a7c] text-black cursor-pointer shadow-md"
                    : "bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-850"
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Developer visibility Debug panel */}
            {isDev && (
              <div className="mt-4 p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-900/60 font-mono text-[8px] text-zinc-500 space-y-0.5">
                <div>[DEBUG COMPONENT DATA]</div>
                <div>• Message Count: {filteredMessages.length}</div>
                <div>• Thread Type: {activeThread.type}</div>
                <div>• Thread ID: {activeThread.type === "general" ? "NULL" : activeThread.plan.dbUuid}</div>
                <div>• Circle ID: {circleUuid}</div>
                <div>• Plan ID: {activeThread.type === "general" ? "NULL" : activeThread.plan.dbUuid}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

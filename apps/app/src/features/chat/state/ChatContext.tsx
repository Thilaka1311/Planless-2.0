import React, { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from "react";
import { ChatMessage, DbCircleMessage } from "../../../core/types";
import { supabase } from "../../../lib/supabaseClient";

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined" || !window.localStorage) return {};
  
  const query = new URLSearchParams(window.location.search);
  const sessionKey = query.get("session") || query.get("user") || "default";
  const localStorageKey = `planless_active_user_${sessionKey}`;
  
  let saved = localStorage.getItem(localStorageKey);
  if (!saved) {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("planless_active_user_")) {
        saved = localStorage.getItem(key);
        if (saved) break;
      }
    }
  }

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.token) {
        return { "Authorization": `Bearer ${parsed.token}` };
      }
    } catch (e) {
      // ignore
    }
  }
  return {};
}

interface ChatState {
  activeCircleId: string | null;
  activePlanId: string | null;
  messages: ChatMessage[];
  isLoading: boolean;
  connectionStatus: "Connected" | "Reconnecting" | "Offline";
  activeUnreadCounts: Record<string, number>; // circleId/planId -> unread message count
  threadReads: Record<string, string | null>;
  unreadCounts: Record<string, number>;
  setActiveRoom: (circleId: string | null, planId: string | null) => void;
  sendMessage: (content: string, options?: { messageType?: "user" | "system"; systemActorId?: string }) => Promise<void>;
  loadMessages: () => Promise<void>;
  markThreadRead: (circleId: string, planId: string | null) => Promise<void>;
}

const ChatContext = createContext<ChatState | undefined>(undefined);

export const ChatProvider = ({
  children,
  userId = ""
}: {
  children: ReactNode;
  userId?: string;
}) => {
  const [activeCircleId, setActiveCircleId] = useState<string | null>(null);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"Connected" | "Reconnecting" | "Offline">("Offline");
  const [activeUnreadCounts, setActiveUnreadCounts] = useState<Record<string, number>>({});

  // New state variables for unread counts tracking
  const [threadReads, setThreadReads] = useState<Record<string, string | null>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [circleMessages, setCircleMessages] = useState<ChatMessage[]>([]);

  const activeCircleIdRef = useRef<string | null>(null);
  const activePlanIdRef = useRef<string | null>(null);

  // Sync refs to use in callbacks without stale closures
  useEffect(() => {
    activeCircleIdRef.current = activeCircleId;
    activePlanIdRef.current = activePlanId;
  }, [activeCircleId, activePlanId]);

  // Unified load function
  const loadMessages = useCallback(async () => {
    const circleId = activeCircleIdRef.current;
    const planId = activePlanIdRef.current;
    if (!circleId && !planId) {
      setMessages([]);
      return;
    }

    setIsLoading(true);
    try {
      let url = `/api/db/chat/messages?user_id=${userId}`;
      if (planId) {
        url += `&plan_id=${planId}`;
      } else if (circleId) {
        url += `&circle_id=${circleId}`;
      }

      const res = await fetch(url, { headers: getAuthHeader() });
      if (!res.ok) {
        console.warn("[ChatContext] Failed to load messages. Server returned status:", res.status);
        return;
      }

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.warn("[ChatContext] Received non-JSON response from server:", contentType);
        return;
      }

      const json = await res.json();
      const raw = json.data || [];
      
      // Map raw DB messages to client ChatMessage views (sorting ascending for UI feed rendering)
      const mapped: ChatMessage[] = raw.map((msg: any) => ({
        id: msg.id,
        circleId: msg.circle_id,
        parentId: msg.parent_id,
        planId: msg.plan_id,
        sender: msg.sender ? {
          id: msg.sender.id,
          name: msg.sender.full_name || msg.sender.username || "User",
          avatar: msg.sender.profile_photo || ""
        } : null,
        systemActor: msg.systemActor ? {
          id: msg.systemActor.id,
          name: msg.systemActor.full_name || msg.systemActor.username || "User",
          avatar: msg.systemActor.profile_photo || ""
        } : null,
        content: msg.content,
        type: msg.message_type as "user" | "system",
        createdAt: msg.created_at,
        editedAt: msg.edited_at,
        isOwn: msg.sender_id === userId
      }));

      // API returns DESC limit 50, so reverse to render ASC (oldest at top, newest at bottom)
      setMessages(mapped.reverse());
    } catch (err) {
      console.error("[ChatContext] Failed to load messages:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Read markers fetch
  const fetchReadMarkers = useCallback(async () => {
    if (!userId || !activeCircleId) return;
    try {
      const { data } = await supabase
        .from("circle_thread_reads")
        .select("*")
        .eq("user_id", userId)
        .eq("circle_id", activeCircleId);
      
      if (data) {
        const mapping: Record<string, string | null> = {};
        data.forEach((row: any) => {
          const key = row.plan_id ? `plan:${row.plan_id}` : `general:${row.circle_id}`;
          mapping[key] = row.last_read_message_id;
        });
        setThreadReads(mapping);
      }
    } catch (err) {
      console.error("[ChatContext] Failed to fetch read markers:", err);
    }
  }, [userId, activeCircleId]);

  // Load all circle messages for previewing and unread calculations
  const loadAllCircleMessages = useCallback(async () => {
    if (!activeCircleId) return;
    try {
      const res = await fetch(`/api/db/chat/messages?circle_id=${activeCircleId}&user_id=${userId}`, { headers: getAuthHeader() });
      if (res.ok) {
        const json = await res.json();
        const raw = json.data || [];
        const mapped = raw.map((msg: any) => ({
          id: msg.id,
          circleId: msg.circle_id,
          parentId: msg.parent_id,
          planId: msg.plan_id,
          sender: msg.sender ? {
            id: msg.sender.id,
            name: msg.sender.full_name || msg.sender.username || "User",
            avatar: msg.sender.profile_photo || ""
          } : null,
          content: msg.content,
          type: msg.message_type,
          createdAt: msg.created_at,
          isOwn: msg.sender_id === userId
        }));
        setCircleMessages(mapped.reverse());
      }
    } catch (e) {
      console.error("[ChatContext] Failed to load circle messages:", e);
    }
  }, [activeCircleId, userId]);

  // Load read markers and circle messages when focus changes
  useEffect(() => {
    if (activeCircleId && userId) {
      fetchReadMarkers();
      loadAllCircleMessages();
    } else {
      setThreadReads({});
      setCircleMessages([]);
    }
  }, [activeCircleId, userId, fetchReadMarkers, loadAllCircleMessages]);

  // Live unread counts computation
  useEffect(() => {
    if (!activeCircleId || !userId) {
      setUnreadCounts({});
      return;
    }

    const counts: Record<string, number> = {};

    // 1. General Chat
    const generalKey = `general:${activeCircleId}`;
    const lastReadGenId = threadReads[generalKey];
    const genMsgs = circleMessages.filter(m => !m.planId && m.sender?.id !== userId && m.type !== "system");
    
    if (genMsgs.length > 0) {
      if (lastReadGenId) {
        const idx = genMsgs.findIndex(m => m.id === lastReadGenId);
        if (idx !== -1) {
          counts[generalKey] = genMsgs.slice(idx + 1).length;
        } else {
          counts[generalKey] = genMsgs.length;
        }
      } else {
        counts[generalKey] = genMsgs.length;
      }
    } else {
      counts[generalKey] = 0;
    }

    // 2. Plan Threads present in messages
    const planIdsInMsgs = Array.from(new Set(circleMessages.map(m => m.planId).filter(Boolean)));
    planIdsInMsgs.forEach(planId => {
      const planKey = `plan:${planId}`;
      const lastReadPlanId = threadReads[planKey];
      const planMsgs = circleMessages.filter(m => m.planId === planId && m.sender?.id !== userId && m.type !== "system");
      if (planMsgs.length > 0) {
        if (lastReadPlanId) {
          const idx = planMsgs.findIndex(m => m.id === lastReadPlanId);
          if (idx !== -1) {
            counts[planKey] = planMsgs.slice(idx + 1).length;
          } else {
            counts[planKey] = planMsgs.length;
          }
        } else {
          counts[planKey] = planMsgs.length;
        }
      } else {
        counts[planKey] = 0;
      }
    });

    setUnreadCounts(counts);
  }, [circleMessages, threadReads, activeCircleId, userId]);

  // Background recovery triggers
  const lastRecoveryRef = useRef<number>(0);
  useEffect(() => {
    const triggerRecovery = () => {
      const now = Date.now();
      if (now - lastRecoveryRef.current < 10000) return;
      lastRecoveryRef.current = now;
      console.log("[ChatContext Recovery] Connection active, refetching current room messages...");
      loadMessages();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") triggerRecovery();
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", triggerRecovery);
    window.addEventListener("online", triggerRecovery);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", triggerRecovery);
      window.removeEventListener("online", triggerRecovery);
    };
  }, [loadMessages]);

  // Setup circle-scoped realtime subscription channel
  useEffect(() => {
    if (!activeCircleId) {
      setMessages([]);
      return;
    }

    console.log(`[ChatContext Realtime] Subscribing to circle channel: circle-realtime-${activeCircleId}`);
    const lastStatusRef = { current: "" };

    const channel = supabase
      .channel(`circle-realtime-${activeCircleId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "circle_messages",
          filter: `circle_id=eq.${activeCircleId}`
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            const raw = payload.new as DbCircleMessage;

            // Fetch sender profile details to map cleanly (or fallback if already fetched)
            let senderProfile = null;
            if (raw.sender_id) {
              try {
                const res = await fetch(`/api/db/fetch-all?tables=users`, { headers: getAuthHeader() });
                if (res.ok) {
                  const json = await res.json();
                  const list = json.data?.users || [];
                  const match = list.find((u: any) => u.id === raw.sender_id);
                  if (match) {
                    senderProfile = {
                      id: match.id,
                      name: match.full_name || match.username || "User",
                      avatar: match.profile_photo || ""
                    };
                  }
                }
              } catch (e) {
                console.error("[ChatContext Realtime] Error resolving sender details:", e);
              }
            }

            let systemActorProfile = null;
            if (raw.system_actor_id) {
              try {
                const res = await fetch(`/api/db/fetch-all?tables=users`, { headers: getAuthHeader() });
                if (res.ok) {
                  const json = await res.json();
                  const list = json.data?.users || [];
                  const match = list.find((u: any) => u.id === raw.system_actor_id);
                  if (match) {
                    systemActorProfile = {
                      id: match.id,
                      name: match.full_name || match.username || "User",
                      avatar: match.profile_photo || ""
                    };
                  }
                }
              } catch (e) {
                console.error("[ChatContext Realtime] Error resolving system actor details:", e);
              }
            }

            const incomingMessage: ChatMessage = {
              id: raw.id,
              circleId: raw.circle_id,
              parentId: raw.parent_id,
              planId: raw.plan_id,
              sender: senderProfile,
              systemActor: systemActorProfile,
              content: raw.content,
              type: raw.message_type as "user" | "system",
              createdAt: raw.created_at,
              editedAt: raw.edited_at,
              isOwn: raw.sender_id === userId
            };

            // Keep circleMessages updated in realtime
            setCircleMessages(prev => {
              const exists = prev.some(m => m.id === incomingMessage.id);
              if (exists) return prev;
              return [...prev, incomingMessage];
            });

            // Check if it belongs to the active view (either the general circle chat or the plan thread)
            const currentPlanId = activePlanIdRef.current;
            if (currentPlanId) {
              if (raw.plan_id !== currentPlanId) return; // Ignore messages from other threads
            } else {
              if (raw.parent_id !== null || raw.plan_id !== null) return; // Ignore plan thread messages in general view
            }

            setMessages(prev => {
              // De-duplicate by ID
              const exists = prev.some(m => m.id === incomingMessage.id);
              if (exists) return prev;
              return [...prev, incomingMessage];
            });
          }
        }
      )
      .subscribe((status) => {
        const prevStatus = lastStatusRef.current;
        lastStatusRef.current = status;
        if (status === "SUBSCRIBED") {
          setConnectionStatus("Connected");
          if (prevStatus && prevStatus !== "SUBSCRIBED") {
            loadMessages();
          }
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setConnectionStatus("Reconnecting");
        } else {
          setConnectionStatus("Offline");
        }
      });

    return () => {
      console.log(`[ChatContext Realtime] Unsubscribing from circle channel: circle-realtime-${activeCircleId}`);
      channel.unsubscribe();
    };
  }, [activeCircleId, loadMessages, userId]);

  // Subscribe to circle_thread_reads realtime updates
  useEffect(() => {
    if (!userId) return;

    const readsChannel = supabase
      .channel(`circle-reads-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "circle_thread_reads",
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchReadMarkers();
        }
      )
      .subscribe();

    return () => {
      readsChannel.unsubscribe();
    };
  }, [userId, fetchReadMarkers]);

  // Set the current room focus
  const setActiveRoom = useCallback((circleId: string | null, planId: string | null) => {
    setActiveCircleId(circleId);
    setActivePlanId(planId);
  }, []);

  // Set room change side-effects (loading history on room load)
  useEffect(() => {
    if (activeCircleId || activePlanId) {
      loadMessages();
    } else {
      setMessages([]);
    }
  }, [activeCircleId, activePlanId, loadMessages]);

  // Mark thread as read
  const markThreadRead = useCallback(async (circleId: string, planId: string | null) => {
    if (!userId) return;

    // Get the last message in this thread from circleMessages
    const threadMsgs = circleMessages.filter(m => {
      if (planId) {
        return m.planId === planId;
      } else {
        return !m.planId;
      }
    });

    if (threadMsgs.length === 0) return;
    const lastMsg = threadMsgs[threadMsgs.length - 1];

    try {
      let query = supabase
        .from("circle_thread_reads")
        .select("id")
        .eq("user_id", userId)
        .eq("circle_id", circleId);

      if (planId) {
        query = query.eq("plan_id", planId);
      } else {
        query = query.is("plan_id", null);
      }

      const { data } = await query;

      if (data && data.length > 0) {
        await supabase
          .from("circle_thread_reads")
          .update({ last_read_message_id: lastMsg.id, updated_at: new Date().toISOString() })
          .eq("id", data[0].id);
      } else {
        await supabase
          .from("circle_thread_reads")
          .insert({
            user_id: userId,
            circle_id: circleId,
            plan_id: planId,
            last_read_message_id: lastMsg.id,
            updated_at: new Date().toISOString()
          });
      }

      // Update local state to immediately clear counts in UI
      const key = planId ? `plan:${planId}` : `general:${circleId}`;
      setThreadReads(prev => ({ ...prev, [key]: lastMsg.id }));
    } catch (e) {
      console.error("[ChatContext] Failed to mark thread read:", e);
    }
  }, [userId, circleMessages]);

  // Send a message
  const sendMessage = useCallback(async (
    content: string,
    options?: { messageType?: "user" | "system"; systemActorId?: string }
  ) => {
    const circleId = activeCircleIdRef.current;
    const planId = activePlanIdRef.current;

    if (!circleId) {
      console.warn("[ChatContext] Cannot send message: active circleId is null.");
      return;
    }

    const type = options?.messageType || "user";
    const senderId = type === "system" ? null : userId;
    const actorId = options?.systemActorId || null;

    const payload: Partial<DbCircleMessage> = {
      circle_id: circleId,
      sender_id: senderId,
      system_actor_id: actorId,
      content,
      message_type: type,
      plan_id: planId || null,
      parent_id: null
    };

    // Client-side optimistic insert for immediate feedback
    const tempId = `optimistic-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      circleId,
      parentId: null,
      planId: planId || null,
      sender: senderId ? { id: senderId, name: "Sending...", avatar: "" } : null,
      systemActor: null,
      content,
      type,
      createdAt: new Date().toISOString(),
      editedAt: null,
      isOwn: type !== "system"
    };

    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const res = await fetch("/api/db/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ table: "circle_messages", records: [payload] })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Upsert failed");
      }

      const json = await res.json();
      const savedRow = json.data?.[0];

      // Replace optimistic message with the confirmed record from the database
      if (savedRow) {
        setMessages(prev =>
          prev.map(m =>
            m.id === tempId
              ? {
                  ...m,
                  id: savedRow.id,
                  createdAt: savedRow.created_at
                }
              : m
          )
        );
      }
    } catch (err: any) {
      console.error("[ChatContext] Send message failed:", err);
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== tempId));
      alert(`Failed to send: ${err.message}`);
    }
  }, [userId]);

  return (
    <ChatContext.Provider
      value={{
        activeCircleId,
        activePlanId,
        messages,
        isLoading,
        connectionStatus,
        activeUnreadCounts,
        threadReads,
        unreadCounts,
        setActiveRoom,
        sendMessage,
        loadMessages,
        markThreadRead
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChatStore = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChatStore must be used within a ChatProvider");
  }
  return context;
};

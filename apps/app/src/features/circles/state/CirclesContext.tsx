import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect, useRef } from "react";
import { Circle, DbCircle, DbCircleMember, User } from "../../../core/types";
import { mapCirclesToLegacyCircles } from "../../../lib/mappers";
import { insertCircle, insertCircleMembers, syncUserStats, deleteCircleMember } from "../../../lib/db";
import { useProfileStore } from "../../profile/state/ProfileContext";
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

const originalFetch = window.fetch;
const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const headers = getAuthHeader();
  const newInit = {
    ...init,
    headers: {
      ...init?.headers,
      ...headers
    }
  };
  return originalFetch(input, newInit);
};

interface CirclesState {
  circles: Circle[];
  setCircles: React.Dispatch<React.SetStateAction<Circle[]>>;
  dbCircles: DbCircle[];
  setDbCircles: React.Dispatch<React.SetStateAction<DbCircle[]>>;
  dbCircleMembers: DbCircleMember[];
  setDbCircleMembers: React.Dispatch<React.SetStateAction<DbCircleMember[]>>;
  createCircle: (name: string, description: string, image: string, selectedFriendIds: string[], activeUserId: string, dbUsers: User[]) => Circle;
  removeCircleMember: (circleId: string, memberUserUuid: string) => Promise<void>;
  updateCircleMemberRole: (circleId: string, memberUserUuid: string, newRole: "host" | "co_host" | "member") => Promise<void>;
  transferCircleHost: (circleId: string, targetUserUuid: string) => Promise<void>;
  refreshCircles: (targetTables?: string[]) => Promise<void>;
  insertCircleSystemMessage?: (circleId: string, content: string, actorUuid: string | null) => Promise<void>;
}

const CirclesContext = createContext<CirclesState | undefined>(undefined);

export const CirclesProvider = ({ 
  children, 
  userId = "" 
}: { 
  children: ReactNode; 
  userId?: string;
}) => {
  const [dbCircles, setDbCircles] = useState<DbCircle[]>([]);
  const [dbCircleMembers, setDbCircleMembers] = useState<DbCircleMember[]>([]);

  const [circles, setCircles] = useState<Circle[]>([]);

  const { dbUsers } = useProfileStore();

  const refreshCircles = useCallback(async (targetTables?: string[]) => {
    try {
      const url = targetTables ? `/api/db/fetch-all?tables=${targetTables.join(",")}` : "/api/db/fetch-all";
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        const d = json.data || {};
        if (d.circles !== undefined) setDbCircles(d.circles);
        if (d.circle_members !== undefined) setDbCircleMembers(d.circle_members);
        console.log(`[CirclesContext refreshCircles] Refreshed circles state (targeted: ${targetTables?.join(",") || "all"}).`);
      }
    } catch (err) {
      console.error("[CirclesContext refreshCircles] Failed to fetch updated state:", err);
    }
  }, []);

  // Recovery from backgrounding, sleep, or network offline transitions
  const lastRecoveryRef = useRef<number>(0);
  useEffect(() => {
    const triggerRecovery = () => {
      const now = Date.now();
      if (now - lastRecoveryRef.current < 10000) {
        console.log("[CirclesContext Recovery] Debounced duplicate recovery event.");
        return;
      }
      lastRecoveryRef.current = now;
      console.log("[CirclesContext Recovery] App active/online. Running reconciliation fetch...");
      refreshCircles(["circles", "circle_members"]);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        triggerRecovery();
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", triggerRecovery);
    window.addEventListener("online", triggerRecovery);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", triggerRecovery);
      window.removeEventListener("online", triggerRecovery);
    };
  }, [refreshCircles]);

  // Reactive Pipeline to derive mapped legacy circles
  useEffect(() => {
    const myCircleIds = userId
      ? dbCircleMembers.filter(cm => cm.user_id === userId).map(cm => cm.circle_id)
      : [];
    const myCircles = dbCircles.filter(c => myCircleIds.includes(c.id) || myCircleIds.includes(c.circle_id));
    setCircles(mapCirclesToLegacyCircles(myCircles, dbCircleMembers, dbUsers));
  }, [dbCircles, dbCircleMembers, dbUsers, userId]);

  // Realtime subscription for circle_members and circles tables
  useEffect(() => {
    console.log("[CirclesContext] Initializing circles and circle_members realtime subscription");
    const lastStatusRef = { current: "" };
    const channel = supabase
      .channel("public:circles_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "circle_members" },
        (payload) => {
          
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const newRecord = payload.new as DbCircleMember;
            if (!newRecord.circle_id || !newRecord.user_id) return;
            
            // Filter: Ignore unrelated rows if circle_id is not in dbCircles
            const belongsToKnownCircle = dbCircles.some(
              c => c.circle_id === newRecord.circle_id || c.id === newRecord.circle_id
            );
            if (!belongsToKnownCircle) {
              return;
            }
            
            setDbCircleMembers(prev => {
              const exists = prev.some(
                cm => cm.circle_id === newRecord.circle_id && cm.user_id === newRecord.user_id
              );
              if (exists) {
                return prev.map(cm => 
                  cm.circle_id === newRecord.circle_id && cm.user_id === newRecord.user_id
                    ? { ...cm, ...newRecord }
                    : cm
                );
              }
              return [...prev, newRecord];
            });
          } else if (payload.eventType === "DELETE") {
            const oldRecord = payload.old as Partial<DbCircleMember>;
            if (!oldRecord.circle_id || !oldRecord.user_id) {
              console.warn("[CirclesContext Realtime] DELETE payload missing key fields:", oldRecord);
              return;
            }
            
            // Filter: Ignore unrelated rows if circle_id is not in dbCircles
            const belongsToKnownCircle = dbCircles.some(
              c => c.circle_id === oldRecord.circle_id || c.id === oldRecord.circle_id
            );
            if (!belongsToKnownCircle) {
              return;
            }
            
            setDbCircleMembers(prev => 
              prev.filter(cm => !(cm.circle_id === oldRecord.circle_id && cm.user_id === oldRecord.user_id))
            );
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "circles" },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const newRecord = payload.new as DbCircle;
            if (!newRecord.id && !newRecord.circle_id) return;
            
            setDbCircles(prev => {
              const exists = prev.some(
                c => (newRecord.id && c.id === newRecord.id) || 
                     (newRecord.circle_id && c.circle_id === newRecord.circle_id)
              );
              if (exists) {
                return prev.map(c => 
                  ((newRecord.id && c.id === newRecord.id) || 
                   (newRecord.circle_id && c.circle_id === newRecord.circle_id))
                    ? { ...c, ...newRecord }
                    : c
                );
              }
              return [newRecord, ...prev];
            });
          } else if (payload.eventType === "DELETE") {
            const oldRecord = payload.old as Partial<DbCircle>;
            if (!oldRecord.id && !oldRecord.circle_id) return;
            
            setDbCircles(prev => 
              prev.filter(c => 
                !((oldRecord.id && c.id === oldRecord.id) || 
                  (oldRecord.circle_id && c.circle_id === oldRecord.circle_id))
              )
            );
          }
        }
      )
      .subscribe((status) => {
        console.log("[CirclesContext Realtime] Subscription status change:", status);
        const prevStatus = lastStatusRef.current;
        lastStatusRef.current = status;

        if (status === "SUBSCRIBED") {
          if (prevStatus && prevStatus !== "SUBSCRIBED") {
            console.log("[Realtime] Recovered");
            refreshCircles(["circles", "circle_members"]);
          } else {
            console.log("[Realtime] Connected");
          }
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          console.log("[Realtime] Reconnecting");
        }
      });

    return () => {
      console.log("[CirclesContext] Cleaning up circles/circle_members realtime subscription");
      channel.unsubscribe();
    };
  }, [dbCircles, refreshCircles]);

  const createCircle = (
    name: string, 
    description: string, 
    image: string, 
    selectedFriendIds: string[],
    activeUserId: string,
    dbUsers: User[]
  ) => {
    const circleId = `C_${Date.now()}`;
    const newDbCircle: DbCircle = {
      circle_id: circleId,
      name,
      description,
      category: "custom",
      created_by: activeUserId,
      cover_image: image,
      location_anchor: "Third Wave Coffee",
      privacy: "private",
      created_at: new Date().toISOString()
    };

    const activeUserObj = dbUsers.find(u => u.user_id === activeUserId || (u as any).id === activeUserId);
    const activeUserUuid = activeUserObj ? (activeUserObj as any).id : activeUserId;

    // Database insertion trigger (background promise execution)
    const persistCircle = async () => {
      try {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isUuid = (val: any) => typeof val === "string" && uuidRegex.test(val);

        if (!activeUserUuid || !isUuid(activeUserUuid)) {
          console.error(`[CirclesContext] Cannot insert circle: creator user UUID is missing or invalid:`, activeUserUuid);
          return;
        }

        const savedCircle = await insertCircle({
          circle_id: newDbCircle.circle_id,
          name: newDbCircle.name,
          description: newDbCircle.description,
          category: newDbCircle.category,
          created_by: activeUserUuid,
          cover_image: newDbCircle.cover_image,
          location_anchor: newDbCircle.location_anchor,
          privacy: newDbCircle.privacy,
          created_at: newDbCircle.created_at
        });

        if (savedCircle && savedCircle.id) {
          const circleUuid = savedCircle.id;

          const membersToInsert = [
            {
              circle_id: circleUuid,
              user_id: activeUserUuid,
              role: "host" as const,
              joined_at: new Date().toISOString()
            },
            ...selectedFriendIds.map(fid => {
              const uObj = dbUsers.find(u => u.user_id === fid || (u as any).id === fid);
              const uUuid = uObj ? (uObj as any).id : fid;
              return {
                circle_id: circleUuid,
                user_id: uUuid,
                role: "member" as const,
                joined_at: new Date().toISOString()
              };
            })
          ].filter(m => {
            if (!m.user_id || !isUuid(m.user_id)) {
              console.error(`[CirclesContext] Skipping circle member insert: user_id is missing or not a valid UUID:`, m.user_id);
              return false;
            }
            return true;
          });

          if (membersToInsert.length > 0) {
            await insertCircleMembers(membersToInsert);

            // Update statistics: increment circles_joined for all members
            for (const m of membersToInsert) {
              await syncUserStats(m.user_id, "join_circle");
              const joinedUser = dbUsers.find(u => u.id === m.user_id || u.user_id === m.user_id || (u as any).dbUuid === m.user_id);
              const userName = joinedUser?.name || joinedUser?.full_name || "Someone";
              await insertCircleSystemMessage(circleUuid, `${userName} joined the circle`, m.user_id);
            }
          } else {
            console.warn(`[CirclesContext] No valid members to insert into circle_members.`);
          }
        }
      } catch (err) {
        console.error("[Circles] Failed to persist circle to database:", err);
      }
    };
    persistCircle();

    const newMembers: DbCircleMember[] = [
      {
        circle_member_id: `CM_self_${Date.now()}`,
        circle_id: circleId,
        user_id: activeUserId,
        role: "host",
        joined_at: new Date().toISOString()
      },
      ...selectedFriendIds.map((fid, idx) => ({
        circle_member_id: `CM_friend_${idx}_${Date.now()}`,
        circle_id: circleId,
        user_id: fid,
        role: "member" as const,
        joined_at: new Date().toISOString()
      }))
    ];

    setDbCircles(prev => [...prev, newDbCircle]);
    setDbCircleMembers(prev => [...prev, ...newMembers]);

    // Map new legacy Circle
    const allMembersList = newMembers.map(cmr => {
      const u = dbUsers.find(usr => usr.user_id === cmr.user_id);
      return {
        userId: cmr.user_id,
        name: u?.full_name || "Member",
        phone: u?.phone_number || "",
        avatar: u?.profile_photo || ""
      };
    });

    const newLegacyCircle: Circle = {
      id: circleId,
      dbUuid: undefined,
      name,
      membersCount: allMembersList.length,
      avatars: allMembersList.slice(0, 5).map(m => m.avatar),
      groupImage: image,
      lastSpontaneousActivity: "Upcoming plans",
      description,
      type: "Spontaneous Hangout Circle",
      location: "Third Wave Coffee",
      format: "Spontaneous Private Crew",
      playersOnField: allMembersList.length,
      timeWindow: "Flexible hours",
      membersList: allMembersList
    };

    return newLegacyCircle;
  };

  const insertCircleSystemMessage = async (circleId: string, content: string, actorUuid: string | null) => {
    try {
      const circleObj = dbCircles.find(c => c.id === circleId || c.circle_id === circleId);
      const circleUuid = circleObj?.id;
      if (!circleUuid) {
        console.warn("[CirclesContext] Cannot send circle system message: circle not found", circleId);
        return;
      }

      const payload = {
        circle_id: circleUuid,
        sender_id: null,
        system_actor_id: actorUuid,
        content,
        message_type: "system",
        plan_id: null,
        parent_id: null
      };

      console.log(`[CirclesContext] Inserting circle system message:`, payload);
      const res = await fetch("/api/db/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "circle_messages", records: [payload] })
      });
      if (!res.ok) {
        console.error("[CirclesContext] Failed to upsert circle system message:", await res.text());
      }
    } catch (err) {
      console.error("[CirclesContext] Exception during circle system message insert:", err);
    }
  };

  const removeCircleMember = async (circleId: string, memberUserUuid: string) => {
    const isUuid = (val: string) => typeof val === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    // 1. Find the circle
    const circleObj = dbCircles.find(c => c.id === circleId || c.circle_id === circleId);
    if (!circleObj) {
      throw new Error("Circle not found");
    }

    const circleUuid = circleObj.id;
    if (!circleUuid || !isUuid(circleUuid)) {
      throw new Error("Invalid or missing database UUID for circle.");
    }

    // 2. Validate permission
    const actorMember = dbCircleMembers.find(cm => (cm.circle_id === circleUuid || cm.circle_id === circleId) && cm.user_id === userId);
    const isActorHost = actorMember?.role === "host" || circleObj.created_by === userId;
    const isActorCoHost = actorMember?.role === "co_host";

    if (!isActorHost && !isActorCoHost) {
      throw new Error("Unauthorized: Only the Circle Host or Co-hosts can remove members.");
    }

    const targetMember = dbCircleMembers.find(cm => (cm.circle_id === circleUuid || cm.circle_id === circleId) && cm.user_id === memberUserUuid);
    const isTargetHost = circleObj.created_by === memberUserUuid || targetMember?.role === "host";
    const isTargetCoHost = targetMember?.role === "co_host";

    if (isTargetHost) {
      throw new Error("Circle Host cannot be removed.");
    }

    if (isActorCoHost && isTargetCoHost) {
      throw new Error("Co-hosts cannot remove other Co-hosts.");
    }

    if (memberUserUuid === userId) {
      throw new Error("You cannot remove yourself.");
    }

    // 3. Delete member row
    console.log(`[CirclesContext removeCircleMember] Deleting member ${memberUserUuid} from circle ${circleUuid}`);
    const deleteSuccess = await deleteCircleMember(circleUuid, memberUserUuid);
    if (!deleteSuccess) {
      throw new Error("Failed to delete member row from database.");
    }

    // 4. Send notification to removed user
    const notifRecord = {
      user_id: memberUserUuid,
      type: "CIRCLE_MEMBER_REMOVED",
      title: `You were removed from "${circleObj.name}"`,
      body: "A circle co-host removed you from this circle.",
      reference_id: circleUuid,
      is_read: false,
      created_at: new Date().toISOString()
    };

    console.log("[CirclesContext removeCircleMember] Writing CIRCLE_MEMBER_REMOVED notification:", notifRecord);
    await fetch("/api/db/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "notifications", records: [notifRecord] })
    }).catch(err => console.error("[CirclesContext removeCircleMember] Failed to save notification:", err));

    // Phase 7: System message for leaving circle
    const targetUser = dbUsers.find(u => u.id === memberUserUuid || u.user_id === memberUserUuid || (u as any).dbUuid === memberUserUuid);
    const targetName = targetUser?.name || targetUser?.full_name || "Someone";
    await insertCircleSystemMessage(circleUuid, `${targetName} left the circle`, memberUserUuid);

    // 5. Update local React states immediately
    setDbCircleMembers(prev => prev.filter(m => !(m.circle_id === circleUuid && m.user_id === memberUserUuid)));
  };

  const updateCircleMemberRole = async (circleId: string, memberUserUuid: string, newRole: "host" | "co_host" | "member") => {
    const isUuid = (val: string) => typeof val === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    const circleObj = dbCircles.find(c => c.id === circleId || c.circle_id === circleId);
    if (!circleObj) throw new Error("Circle not found");

    const circleUuid = circleObj.id;
    if (!circleUuid || !isUuid(circleUuid)) {
      throw new Error("Invalid or missing database UUID for circle.");
    }

    // Only Host can promote/demote
    const actorMember = dbCircleMembers.find(cm => (cm.circle_id === circleUuid || cm.circle_id === circleId) && cm.user_id === userId);
    const isActorHost = actorMember?.role === "host" || circleObj.created_by === userId;

    if (!isActorHost) {
      throw new Error("Unauthorized: Only the Circle Host can manage roles.");
    }

    if (newRole === "host") {
      throw new Error("Cannot promote to Host directly.");
    }

    if (memberUserUuid === circleObj.created_by) {
      throw new Error("Cannot change role of the Circle Host.");
    }

    // Find the member record
    const memberRecord = dbCircleMembers.find(cm => (cm.circle_id === circleUuid || cm.circle_id === circleId) && cm.user_id === memberUserUuid);
    if (!memberRecord) throw new Error("Member not found in circle.");

    if (memberRecord.role === "host") {
      throw new Error("Cannot change role of the Circle Host.");
    }

    const updatedRecord = {
      ...memberRecord,
      role: newRole
    };

    // Upsert to DB
    const res = await fetch("/api/db/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "circle_members", records: [updatedRecord] })
    });
    if (!res.ok) throw new Error("Failed to update role in database.");

    // Send notification
    const notifRecord = {
      user_id: memberUserUuid,
      type: newRole === "co_host" ? "CO_HOST_PROMOTED" : "CO_HOST_REMOVED",
      title: newRole === "co_host" ? "You are now a Co-host" : "Co-host access removed",
      body: newRole === "co_host" ? "You can now help manage this circle." : "You are no longer a Co-host in this circle.",
      reference_id: circleUuid,
      is_read: false,
      created_at: new Date().toISOString()
    };

    await fetch("/api/db/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "notifications", records: [notifRecord] })
    }).catch(err => console.error("[CirclesContext updateRole] Failed to save notification:", err));

    // Phase 7: System message for co-host promotion
    if (newRole === "co_host") {
      const targetUser = dbUsers.find(u => u.id === memberUserUuid || u.user_id === memberUserUuid || (u as any).dbUuid === memberUserUuid);
      const targetName = targetUser?.name || targetUser?.full_name || "Someone";
      await insertCircleSystemMessage(circleUuid, `${targetName} promoted to Co-host`, memberUserUuid);
    }

    // Update local React state
    setDbCircleMembers(prev => prev.map(m => (m.circle_id === circleUuid || m.circle_id === circleId) && m.user_id === memberUserUuid ? { ...m, role: newRole } : m));
  };

  const transferCircleHost = async (circleId: string, targetUserUuid: string) => {
    const circleObj = dbCircles.find(c => c.id === circleId || c.circle_id === circleId);
    if (!circleObj) throw new Error("Circle not found");
    const circleUuid = circleObj.id || circleObj.circle_id;

    // 1. Only the current Host can transfer
    const actorMember = dbCircleMembers.find(cm => (cm.circle_id === circleUuid || cm.circle_id === circleId) && cm.user_id === userId);
    const isActorHost = actorMember?.role === "host" || circleObj.created_by === userId;

    if (!isActorHost) {
      throw new Error("Unauthorized: Only the Circle Host can transfer ownership.");
    }

    if (targetUserUuid === userId) {
      throw new Error("You are already the Circle Host.");
    }

    // Find the target member record
    const targetMember = dbCircleMembers.find(cm => (cm.circle_id === circleUuid || cm.circle_id === circleId) && cm.user_id === targetUserUuid);
    if (!targetMember) {
      throw new Error("Target user is not a member of this circle.");
    }

    // Find the old host member record
    const oldHostMember = dbCircleMembers.find(cm => (cm.circle_id === circleUuid || cm.circle_id === circleId) && cm.user_id === circleObj.created_by);
    if (!oldHostMember) {
      throw new Error("Current host member record not found.");
    }

    // Prepare atomic updates
    const updatedOldHost = { ...oldHostMember, role: "co_host" as const };
    const updatedNewHost = { ...targetMember, role: "host" as const };
    const updatedCircle = { ...circleObj, created_by: targetUserUuid };

    // Atomically save updates to DB
    const resCM = await fetch("/api/db/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "circle_members", records: [updatedOldHost, updatedNewHost] })
    });
    if (!resCM.ok) throw new Error("Failed to update member roles in database.");

    const resC = await fetch("/api/db/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "circles", records: [updatedCircle] })
    });
    if (!resC.ok) throw new Error("Failed to update circle creator in database.");

    // Send notifications
    const newHostNotif = {
      user_id: targetUserUuid,
      type: "HOST_TRANSFERRED_TO_YOU",
      title: "You are now the Host",
      body: `You now manage this circle: "${circleObj.name}".`,
      reference_id: circleUuid,
      is_read: false,
      created_at: new Date().toISOString()
    };
    const oldHostNotif = {
      user_id: circleObj.created_by,
      type: "HOST_TRANSFERRED",
      title: "Circle Host transferred",
      body: `You are now a Co-host in "${circleObj.name}".`,
      reference_id: circleUuid,
      is_read: false,
      created_at: new Date().toISOString()
    };

    await fetch("/api/db/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "notifications", records: [newHostNotif, oldHostNotif] })
    }).catch(err => console.error("[CirclesContext transferHost] Failed to save notifications:", err));

    // Phase 7: System message for host transfer
    const targetUser = dbUsers.find(u => u.id === targetUserUuid || u.user_id === targetUserUuid || (u as any).dbUuid === targetUserUuid);
    const targetName = targetUser?.name || targetUser?.full_name || "Someone";
    await insertCircleSystemMessage(circleUuid, `Host transferred to ${targetName}`, targetUserUuid);

    // Update local React state
    setDbCircles(prev => prev.map(c => (c.id === circleUuid || c.circle_id === circleId) ? { ...c, created_by: targetUserUuid } : c));

    setDbCircleMembers(prev => prev.map(m => {
      if ((m.circle_id === circleUuid || m.circle_id === circleId)) {
        if (m.user_id === targetUserUuid) return { ...m, role: "host" };
        if (m.user_id === circleObj.created_by) return { ...m, role: "co_host" };
      }
      return m;
    }));
  };

  const memoizedCreateCircle = useCallback(createCircle, []);
  const memoizedRemoveCircleMember = useCallback(removeCircleMember, [dbCircles, dbCircleMembers, userId]);
  const memoizedUpdateCircleMemberRole = useCallback(updateCircleMemberRole, [dbCircles, dbCircleMembers, userId]);
  const memoizedTransferCircleHost = useCallback(transferCircleHost, [dbCircles, dbCircleMembers, userId]);

  const contextValue = useMemo(() => ({
    circles, setCircles,
    dbCircles, setDbCircles,
    dbCircleMembers, setDbCircleMembers,
    createCircle: memoizedCreateCircle,
    removeCircleMember: memoizedRemoveCircleMember,
    updateCircleMemberRole: memoizedUpdateCircleMemberRole,
    transferCircleHost: memoizedTransferCircleHost,
    refreshCircles,
    insertCircleSystemMessage
  }), [
    circles, dbCircles, dbCircleMembers,
    memoizedCreateCircle, memoizedRemoveCircleMember,
    memoizedUpdateCircleMemberRole, memoizedTransferCircleHost,
    refreshCircles,
    insertCircleSystemMessage
  ]);

  return (
    <CirclesContext.Provider value={contextValue}>
      {children}
    </CirclesContext.Provider>
  );
};

export const useCirclesStore = () => {
  const context = useContext(CirclesContext);
  if (context === undefined) {
    throw new Error("useCirclesStore must be used within a CirclesProvider");
  }
  return context;
};

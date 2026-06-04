import React, { createContext, useContext, useState, ReactNode } from "react";
import { Circle, DbCircle, DbCircleMember, User } from "../../../core/types";
import { mapCirclesToLegacyCircles } from "../../../lib/mappers";
import { insertCircle, insertCircleMembers, syncUserStats } from "../../../lib/db";

interface CirclesState {
  circles: Circle[];
  setCircles: React.Dispatch<React.SetStateAction<Circle[]>>;
  dbCircles: DbCircle[];
  setDbCircles: React.Dispatch<React.SetStateAction<DbCircle[]>>;
  dbCircleMembers: DbCircleMember[];
  setDbCircleMembers: React.Dispatch<React.SetStateAction<DbCircleMember[]>>;
  createCircle: (name: string, description: string, image: string, selectedFriendIds: string[], activeUserId: string, dbUsers: User[]) => Circle;
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
              role: "admin" as const,
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
        role: "admin",
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

    setCircles(prev => [newLegacyCircle, ...prev]);
    return newLegacyCircle;
  };

  return (
    <CirclesContext.Provider value={{
      circles, setCircles,
      dbCircles, setDbCircles,
      dbCircleMembers, setDbCircleMembers,
      createCircle
    }}>
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

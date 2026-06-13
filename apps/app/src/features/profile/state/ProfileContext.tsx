import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from "react";
import { UserProfile, User, DbFriendship } from "../../../core/types";
import { updateDbUser } from "../../../lib/db";

interface ProfileState {
  userProfile: UserProfile | null;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  activeUserId: string;      // Short display identifier e.g. "U001" — for UI comparisons only
  activeUserUuid: string;    // Postgres UUID (users.id) — for all DB writes
  dbUsers: User[];
  setDbUsers: React.Dispatch<React.SetStateAction<User[]>>;
  dbUserData: any[];
  setDbUserData: React.Dispatch<React.SetStateAction<any[]>>;
  dbFriendships: DbFriendship[];
  setDbFriendships: React.Dispatch<React.SetStateAction<DbFriendship[]>>;
  updateProfile: (updated: UserProfile) => void;
}

const ProfileContext = createContext<ProfileState | undefined>(undefined);

export const ProfileProvider = ({ 
  children,
  initialProfile,
  onProfileChange
}: { 
  children: ReactNode;
  initialProfile: UserProfile | null;
  onProfileChange?: (profile: UserProfile | null) => void;
}) => {
  const [userProfile, setUserProfileState] = useState<UserProfile | null>(initialProfile);
  const [dbUserData, setDbUserData] = useState<any[]>([]);
  const [dbFriendships, setDbFriendships] = useState<DbFriendship[]>([]);
  const [dbUsers, setDbUsers] = useState<User[]>(() => {
    if (initialProfile) {
      return [{
        user_id: initialProfile.user_id || "U001",
        username: initialProfile.name.toLowerCase().replace(/\s+/g, "") || "thilak",
        full_name: initialProfile.name,
        phone_number: initialProfile.phone,
        profile_photo: initialProfile.avatar,
        bio: initialProfile.bio || "Always spontaneous, never planless.",
        college_or_work: initialProfile.college_or_work || "SRM Chennai",
        created_at: new Date().toISOString(),
        wallet_balance: 0,
        active_status: true,
      }];
    }
    return [];
  });

  const setUserProfile = useCallback((newProfile: UserProfile | null | ((prev: UserProfile | null) => UserProfile | null)) => {
    setUserProfileState(prev => {
      const val = typeof newProfile === "function" ? newProfile(prev) : newProfile;
      if (onProfileChange) onProfileChange(val);
      return val;
    });
  }, [onProfileChange]);

  const updateProfile = useCallback((updated: UserProfile) => {
    setUserProfile(updated);
    
    if (updated.dbUuid) {
      updateDbUser({
        id: updated.dbUuid,
        full_name: updated.name,
        bio: updated.bio || "",
        profile_photo: updated.avatar || "",
        college_or_work: updated.college_or_work || ""
      }).catch(err => {
        console.error("[ProfileContext] Failed to persist profile updates to DB:", err);
      });
    }

    setDbUsers(prev => prev.map(u => {
      if (u.id === updated.dbUuid || u.user_id === updated.user_id) {
        return {
          ...u,
          full_name: updated.name,
          bio: updated.bio || u.bio,
          college_or_work: updated.college_or_work || u.college_or_work,
          profile_photo: updated.avatar || u.profile_photo
        };
      }
      return u;
    }));
  }, [setUserProfile]);

  const activeUserId = userProfile?.dbUuid || "";
  const activeUserUuid = userProfile?.dbUuid || "";

  const contextValue = useMemo(() => ({
    userProfile,
    setUserProfile,
    activeUserId,
    activeUserUuid,
    dbUsers,
    setDbUsers,
    dbUserData,
    setDbUserData,
    dbFriendships,
    setDbFriendships,
    updateProfile
  }), [
    userProfile,
    setUserProfile,
    activeUserId,
    activeUserUuid,
    dbUsers,
    dbUserData,
    dbFriendships,
    updateProfile
  ]);

  return (
    <ProfileContext.Provider value={contextValue}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfileStore = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfileStore must be used within a ProfileProvider");
  }
  return context;
};

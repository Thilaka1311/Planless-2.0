import React, { createContext, useContext, useState, ReactNode } from "react";
import { UserProfile, User } from "../../../core/types";

interface ProfileState {
  userProfile: UserProfile | null;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  activeUserId: string;      // Short display identifier e.g. "U001" — for UI comparisons only
  activeUserUuid: string;    // Postgres UUID (users.id) — for all DB writes
  dbUsers: User[];
  setDbUsers: React.Dispatch<React.SetStateAction<User[]>>;
  dbUserData: any[];
  setDbUserData: React.Dispatch<React.SetStateAction<any[]>>;
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

  const setUserProfile = (newProfile: UserProfile | null | ((prev: UserProfile | null) => UserProfile | null)) => {
    setUserProfileState(prev => {
      const val = typeof newProfile === "function" ? newProfile(prev) : newProfile;
      if (onProfileChange) onProfileChange(val);
      return val;
    });
  };

  const updateProfile = (updated: UserProfile) => {
    setUserProfile(updated);
    setDbUsers(prev => prev.map(u => {
      if (u.user_id === updated.user_id) {
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
  };

  return (
    <ProfileContext.Provider value={{ userProfile, setUserProfile, activeUserId: userProfile?.user_id || "", activeUserUuid: userProfile?.dbUuid || "", dbUsers, setDbUsers, dbUserData, setDbUserData, updateProfile }}>
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

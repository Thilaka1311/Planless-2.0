import React, { useState, useEffect } from "react";
import { OnboardingFlow } from "./components/OnboardingFlow";
import MainApp from "./components/MainApp";
import { UserProfile } from "./core/types";
import { WorkspaceHeader } from "./components/WorkspaceHeader";
import { SimulatorStatusBar } from "./components/SimulatorStatusBar";
import { SimulatorHomeBar } from "./components/SimulatorHomeBar";
import { WorkspaceFooter } from "./components/WorkspaceFooter";
import { PlansProvider } from "./features/plans/state/PlansContext";
import { ProfileProvider, useProfileStore } from "./features/profile/state/ProfileContext";
import { WalletProvider } from "./features/wallet/state/WalletContext";
import { CirclesProvider } from "./features/circles/state/CirclesContext";
import { ChatProvider } from "./features/chat/state/ChatContext";
import { DeveloperPanel } from "./components/dev/DeveloperPanel";

export default function App() {
  const query = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const sessionKey = query.get("session") || query.get("user") || "default";
  const localStorageKey = `planless_active_user_${sessionKey}`;

  const [initialProfile, setInitialProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem(localStorageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.user_id) {
          return parsed;
        }
      } catch (e) {
        localStorage.removeItem(localStorageKey);
      }
    }
    return null;
  });

  const [isSimulatorMode, setIsSimulatorMode] = useState(true);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes();
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      const minStr = minutes < 10 ? "0" + minutes : minutes;
      setCurrentTime(`${hours}:${minStr} ${ampm}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleProfileSync = async (profile: UserProfile | null) => {
    if (profile) {
      localStorage.setItem(localStorageKey, JSON.stringify(profile));
    } else {
      localStorage.removeItem(localStorageKey);
    }
  };

  return (
    <ProfileProvider initialProfile={initialProfile} onProfileChange={handleProfileSync}>
      <AppContent 
        isSimulatorMode={isSimulatorMode} 
        setIsSimulatorMode={setIsSimulatorMode} 
        currentTime={currentTime}
        localStorageKey={localStorageKey}
      />
    </ProfileProvider>
  );
}

function AppContent({ 
  isSimulatorMode, 
  setIsSimulatorMode, 
  currentTime,
  localStorageKey
}: {
  isSimulatorMode: boolean;
  setIsSimulatorMode: React.Dispatch<React.SetStateAction<boolean>>;
  currentTime: string;
  localStorageKey: string;
}) {
  const { userProfile, setUserProfile } = useProfileStore();

  useEffect(() => {
    async function syncDatabaseProfile() {
      if (userProfile && userProfile.phone) {
        try {
          const res = await fetch("/api/auth/login-or-signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: userProfile.phone, name: userProfile.name }),
          });
          if (res.ok) {
            const result = await res.json();
            const user = result.user;
            const updatedProfile = {
              name: user.full_name,
              phone: user.phone_number,
              bio: user.bio || "Always spontaneous, never planless.",
              avatar: user.profile_photo || userProfile.avatar,
              joined: true,
              college_or_work: user.college_or_work || "SRM Chennai",
              user_id: user.user_id,
              dbUuid: user.id,
              token: result.token,
            };
            setUserProfile(updatedProfile);
            localStorage.setItem(localStorageKey, JSON.stringify(updatedProfile));
          }
        } catch (err) {
          console.warn("[App Startup] Session profile restore exception:", err);
        }
      }
    }
    syncDatabaseProfile();
  }, []);

  const handleOnboardingComplete = (newProfile: UserProfile) => {
    setUserProfile(newProfile);
    localStorage.setItem(localStorageKey, JSON.stringify(newProfile));
  };

  const handleLogoutReset = () => {
    setUserProfile(null);
    localStorage.removeItem(localStorageKey);
  };

  return (
    <div className="min-h-screen bg-[#060608] flex flex-col items-center justify-between font-sans selection:bg-[#ff5e3a]/35 overflow-y-auto p-3 sm:p-6 md:p-10">
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-[#ff5e3b] opacity-[0.03] rounded-full blur-[160px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-[#ff8b66] opacity-[0.02] rounded-full blur-[180px] pointer-events-none" />

      <WorkspaceHeader 
        isSimulatorMode={isSimulatorMode}
        setIsSimulatorMode={setIsSimulatorMode}
        profile={userProfile}
        handleLogoutReset={handleLogoutReset}
      />

      <div className="flex-1 w-full flex items-center justify-center py-6 sm:py-8 z-10">
        {!userProfile ? (
          <div className="w-[390px] h-[780px] bg-[#121214] border-[12px] border-[#222225] rounded-[3rem] shadow-2xl relative iphone-frame overflow-hidden flex flex-col">
            <SimulatorStatusBar currentTime={currentTime} />
            <div className="flex-1 overflow-hidden relative">
              <OnboardingFlow onComplete={handleOnboardingComplete} />
            </div>
            <SimulatorHomeBar />
          </div>
        ) : (
          <WalletProvider userId={userProfile.dbUuid}>
            <CirclesProvider userId={userProfile.dbUuid}>
              <PlansProvider userId={userProfile.dbUuid}>
                <ChatProvider userId={userProfile.dbUuid}>
                  <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-8 max-w-6xl w-full mx-auto">
                    {/* Developer Testing Panel (Desktop Layout) */}
                    <DeveloperPanel />

                    {/* Phone Frame */}
                    <div 
                      className={`transition-all duration-500 shrink-0 ${
                        isSimulatorMode 
                          ? "w-[390px] h-[780px] bg-[#121214] border-[12px] border-[#222225] rounded-[3rem] shadow-2xl relative iphone-frame overflow-hidden flex flex-col"
                          : "w-full max-w-md h-[740px] bg-[#0A0A0B] border border-zinc-900 rounded-3xl shadow-xl overflow-hidden flex flex-col"
                      }`}
                    >
                      {isSimulatorMode && <SimulatorStatusBar currentTime={currentTime} />}

                      <div className="flex-1 overflow-hidden relative">
                        <MainApp 
                          userProfile={userProfile} 
                          activeUserId={userProfile.dbUuid || "U001"} 
                          onLogout={handleLogoutReset} 
                        />
                      </div>

                      {isSimulatorMode && <SimulatorHomeBar />}
                    </div>
                  </div>
                </ChatProvider>
              </PlansProvider>
            </CirclesProvider>
          </WalletProvider>
        )}
      </div>

      <WorkspaceFooter />
    </div>
  );
}

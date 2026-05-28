import React, { useState, useEffect } from "react";
import { OnboardingFlow } from "./components/OnboardingFlow";
import { MainApp } from "./components/MainApp";
import { UserProfile } from "./core/types";
import { initialUserProfile } from "./demo/seedData";
import { WorkspaceHeader } from "./components/WorkspaceHeader";
import { SimulatorStatusBar } from "./components/SimulatorStatusBar";
import { SimulatorHomeBar } from "./components/SimulatorHomeBar";
import { WorkspaceFooter } from "./components/WorkspaceFooter";
import { PlansProvider } from "./features/plans/state/PlansContext";
import { HomeProvider } from "./features/home/state/HomeContext";

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem("planless_user_profile");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed) {
          return { ...parsed, user_id: parsed.user_id };
        }
      } catch (e) {
        localStorage.removeItem("planless_user_profile");
      }
    }
    return null;
  });
  const [isSimulatorMode, setIsSimulatorMode] = useState(true);
  const [currentTime, setCurrentTime] = useState("");

  // Load from local storage on load
  useEffect(() => {
    // Dynamic Clock inside top status bar
    const updateClock = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes();
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      const minStr = minutes < 10 ? "0" + minutes : minutes;
      setCurrentTime(`${hours}:${minStr} ${ampm}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 15000);
    return () => clearInterval(interval);
  }, []);

  // Silent automatic reset on fresh onboarding entry to guarantee clean Supabase sandbox
  useEffect(() => {
    if (!profile) {
      fetch("/api/db/reset", { method: "POST" }).catch((err) => {
        console.warn("[Silent DB Reset Warning] Failed to reset database on onboarding:", err);
      });
    }
  }, [profile]);

  const handleOnboardingComplete = (newProfile: UserProfile) => {
    setProfile(newProfile);
    localStorage.setItem("planless_user_profile", JSON.stringify(newProfile));
  };

  const handleLogoutReset = async () => {
    try {
      await fetch("/api/db/reset", { method: "POST" });
    } catch (e) {
      console.warn("Failed to reset Supabase database:", e);
    }
    setProfile(null);
    localStorage.removeItem("planless_user_profile");
  };

  // Helper function to force pre-auth state for demo previewing
  const forcePreAuthDemo = () => {
    handleOnboardingComplete(initialUserProfile);
  };

  return (
    <div className="min-h-screen bg-[#060608] flex flex-col items-center justify-between font-sans selection:bg-[#ff5e3a]/35 overflow-y-auto p-3 sm:p-6 md:p-10">
      
      {/* Dynamic elegant ambient backdrop highlights */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-[#ff5e3b] opacity-[0.03] rounded-full blur-[160px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-[#ff8b66] opacity-[0.02] rounded-full blur-[180px] pointer-events-none" />

      {/* Workspace top navigation/control header */}
      <WorkspaceHeader 
        isSimulatorMode={isSimulatorMode}
        setIsSimulatorMode={setIsSimulatorMode}
        profile={profile}
        forcePreAuthDemo={forcePreAuthDemo}
        handleLogoutReset={handleLogoutReset}
      />

      {/* ---------------- MOBILE CHASSIS SIMULATOR WRAPPER or RESPONSIVE CANVAS ---------------- */}
      <div className="flex-1 w-full flex items-center justify-center py-6 sm:py-8 z-10">
        <div 
          className={`transition-all duration-500 ${
            isSimulatorMode 
              ? "w-[390px] h-[780px] bg-[#121214] border-[12px] border-[#222225] rounded-[3rem] shadow-2xl relative iphone-frame overflow-hidden flex flex-col"
              : "w-full max-w-md h-[740px] bg-[#0A0A0B] border border-zinc-900 rounded-3xl shadow-xl overflow-hidden flex flex-col"
          }`}
        >
          
          {/* SIMULATOR NOTCH & STATUS BAR (Only shown in simulator mode) */}
          {isSimulatorMode && <SimulatorStatusBar currentTime={currentTime} />}

          {/* APP ACTIVE CONTROLLER CONTAINER */}
          <div className="flex-1 overflow-hidden relative">
            <PlansProvider userId={profile?.user_id || "U001"} key={profile?.user_id || "demo-reset"}>
              <HomeProvider>
                {!profile ? (
                  <OnboardingFlow onComplete={handleOnboardingComplete} />
                ) : (
                  <MainApp userProfile={profile} onLogout={handleLogoutReset} onUpdateProfile={handleOnboardingComplete} />
                )}
              </HomeProvider>
            </PlansProvider>
          </div>

          {/* SIMULATOR BOTTOM VIRTUAL THUMB BUTTON */}
          {isSimulatorMode && <SimulatorHomeBar />}

        </div>
      </div>

      {/* Workspace branding footer */}
      <WorkspaceFooter />

    </div>
  );
}

import React, { createContext, useContext, useState, ReactNode } from "react";

interface HomeState {
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  homeBadgeCount: number;
  setHomeBadgeCount: React.Dispatch<React.SetStateAction<number>>;
  notifications: any[];
  setNotifications: React.Dispatch<React.SetStateAction<any[]>>;
  showNotifications: boolean;
  setShowNotifications: React.Dispatch<React.SetStateAction<boolean>>;
}

const HomeContext = createContext<HomeState | undefined>(undefined);

export const HomeProvider = ({ children }: { children: ReactNode }) => {
  const [activeTab, setActiveTab] = useState("home");
  const [homeBadgeCount, setHomeBadgeCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <HomeContext.Provider value={{
      activeTab, setActiveTab,
      homeBadgeCount, setHomeBadgeCount,
      notifications, setNotifications,
      showNotifications, setShowNotifications
    }}>
      {children}
    </HomeContext.Provider>
  );
};

export const useHomeStore = () => {
  const context = useContext(HomeContext);
  if (context === undefined) {
    throw new Error("useHomeStore must be used within a HomeProvider");
  }
  return context;
};

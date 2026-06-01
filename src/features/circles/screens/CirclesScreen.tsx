import React, { useState } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, MoreVertical, Settings } from "lucide-react";
import { CircleDetailScreen } from "./CircleDetailScreen";
import { CircleSettingsScreen } from "./CircleSettingsScreen";
import { CircleChatScreen } from "./CircleChatScreen";
import { CreateCircleMembersScreen } from "./CreateCircleMembersScreen";
import { CreateCircleDetailsScreen } from "./CreateCircleDetailsScreen";

export const CirclesScreen = (props: any) => {
  const {
    circleCreateStep, setCircleCreateStep,
    circles,
    selectedCircle, setSelectedCircle,
    activeUserId,
    setIsInvitingFriends,
    setNewPlanCircleId, setNewPlanTitle, setSelectedExperience: setSelectedPreset, setAudienceType, setSelectedCircleIds, setActiveTab, setCreateFlowStep, triggerToast,
    dbUsers, setCircles, plans, setPaymentConfirmationPlan, handleToggleJoin, setSelectedPlan, setActiveStoryRecap,
    handleCreateCircle
  } = props;

  const [subView, setSubView] = React.useState<"chat" | "detail" | "settings">("chat");
  const [showMenu, setShowMenu] = useState(false);

  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);

  React.useEffect(() => {
    if (selectedCircle) {
      setSubView("chat");
    }
  }, [selectedCircle]);

  return (
    <div id="circles_tab_pane" className="space-y-6 h-full relative">
      <AnimatePresence mode="wait">
        {circleCreateStep === "members" ? (
          <CreateCircleMembersScreen
            dbUsers={dbUsers}
            activeUserId={activeUserId}
            onBack={() => setCircleCreateStep(null)}
            onNext={(selectedIds) => {
              setSelectedFriendIds(selectedIds);
              setCircleCreateStep("details");
            }}
          />
        ) : circleCreateStep === "details" ? (
          <CreateCircleDetailsScreen
            selectedMemberIds={selectedFriendIds}
            dbUsers={dbUsers}
            onBack={() => setCircleCreateStep("members")}
            onSubmit={(name, description, image) => {
              handleCreateCircle(name, description, image, selectedFriendIds);
              setCircleCreateStep(null);
              setSelectedFriendIds([]);
            }}
          />
        ) : !selectedCircle ? (
          // ---------------- USER VIEWS ALL CIRCLES ----------------
          <motion.div 
            key="view_all_circles"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            id="view_all_circles_container" 
            className="space-y-6"
          >
            {/* Lightweight Page Header */}
            <div className="flex items-center justify-between pb-1.5 pt-1.5 relative">
              <h2 className="text-xl font-display font-black text-zinc-100 tracking-tight">Circles</h2>
              <div className="relative">
                <button
                  id="circles_menu_btn"
                  onClick={() => setShowMenu(prev => !prev)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
                  aria-label="More options"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-9 z-50 bg-zinc-900 border border-white/[0.08] rounded-2xl shadow-xl overflow-hidden min-w-[140px] animate-fade-in">
                    <button
                      id="circles_settings_btn"
                      onClick={() => { setActiveTab("profile"); setShowMenu(false); }}
                      className="flex items-center gap-2.5 w-full px-4 py-3 text-left text-xs font-sans text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Settings</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Interactive Circles View */}
            <div id="circles_list" className="space-y-3 pb-8">
              {circles.map(circle => {
                const circleActivePlans = plans.filter((p: any) => p.circleId === circle.id && !p.isHappened);
                
                return (
                  <div key={circle.id} className="bg-zinc-900/40 border border-zinc-900 hover:bg-zinc-850/50 hover:border-zinc-800/80 rounded-3xl overflow-hidden transition-all duration-300">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCircle(circle);
                      }}
                      className="w-full px-4 py-4 flex items-center gap-3 text-left"
                    >
                      <div className="relative shrink-0 w-11 h-11 rounded-2xl overflow-hidden border border-zinc-800 shadow-md">
                        <img
                          src={circle.groupImage || circle.avatars[0] || "https://images.unsplash.com/photo-1543351611-58f69d7c1781?auto=format&fit=crop&q=80&w=200"}
                          className="w-full h-full object-cover"
                          alt={`${circle.name} cover`}
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 justify-between">
                          <div className="min-w-0">
                            <h4 className="text-xs font-display font-black text-white uppercase tracking-wide truncate">{circle.name}</h4>
                            <p className="text-[10px] text-zinc-500 mt-1 leading-snug truncate">
                              {circleActivePlans.length > 0 ? `🔥 Active plan: ${circleActivePlans[0].title}` : "No active plan"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#ff8b66]">
                              {circleActivePlans.length} active
                            </span>
                            <ChevronRight className="w-4 h-4 text-zinc-550" />
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>


          </motion.div>
        ) : subView === "chat" ? (
          <CircleChatScreen
            key="chat"
            circle={selectedCircle}
            plans={plans}
            activeUserId={activeUserId}
            onBack={() => {
              setSelectedCircle(null);
              setIsInvitingFriends(false);
            }}
            onOpenSettings={() => setSubView("detail")}
            setSelectedPlan={setSelectedPlan}
            setPaymentConfirmationPlan={setPaymentConfirmationPlan}
            handleToggleJoin={handleToggleJoin}
            setActiveStoryRecap={setActiveStoryRecap}
            triggerToast={triggerToast}
          />
        ) : subView === "detail" ? (
          <CircleDetailScreen
            key="detail"
            circle={selectedCircle}
            plans={plans}
            activeUserId={activeUserId}
            onBack={() => {
              setSubView("chat");
            }}
            onOpenSettings={() => setSubView("settings")}
            setSelectedPlan={setSelectedPlan}
            setPaymentConfirmationPlan={setPaymentConfirmationPlan}
            handleToggleJoin={handleToggleJoin}
            setActiveStoryRecap={setActiveStoryRecap}
            setNewPlanCircleId={setNewPlanCircleId}
            setNewPlanTitle={setNewPlanTitle}
            setSelectedPreset={setSelectedPreset}
            setAudienceType={setAudienceType}
            setSelectedCircleIds={setSelectedCircleIds}
            setActiveTab={setActiveTab}
            setCreateFlowStep={setCreateFlowStep}
            triggerToast={triggerToast}
          />
        ) : (
          <CircleSettingsScreen
            key="settings"
            circle={selectedCircle}
            setCircles={setCircles}
            setSelectedCircle={setSelectedCircle}
            activeUserId={activeUserId}
            dbUsers={dbUsers}
            onBack={() => setSubView("detail")}
            onBackToCircles={() => setSelectedCircle(null)}
            triggerToast={triggerToast}
          />
        )}
      </AnimatePresence>


    </div>
  );
};

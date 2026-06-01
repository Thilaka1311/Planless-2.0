import React, { useState } from "react";
import { usePlansStore } from "../../plans/state/PlansContext";
import { useProfileStore } from "../../profile/state/ProfileContext";
import { useCirclesStore } from "../../circles/state/CirclesContext";
import { Plan, DbPlan, DbPlanParticipant, NotificationItem } from "../../../core/types";
import { syncUserStats } from "../../../lib/db";

// Import step components
import { BrowseExperiencesStep } from "../components/BrowseExperiencesStep";
import { PlanDetailsStep } from "../components/PlanDetailsStep";
import { InviteRecipientsStep } from "../components/InviteRecipientsStep";
import { ExtraSettingsStep } from "../components/ExtraSettingsStep";
import { PlanPreviewStep } from "../components/PlanPreviewStep";

export function parseSpontaneousDateTimeToIso(displayString: string): string {
  const normalized = displayString.toUpperCase().trim();
  const now = new Date();
  
  if (normalized === "RIGHT NOW!" || normalized === "RIGHT NOW") {
    return now.toISOString();
  }

  let targetDate = new Date();
  if (normalized.includes("TOMORROW")) {
    targetDate.setDate(now.getDate() + 1);
  }

  // Extract time, e.g. "9:30 PM" or "8:00 PM"
  const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM)?/;
  const match = normalized.match(timeRegex);

  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3];

    if (ampm === "PM" && hours < 12) {
      hours += 12;
    } else if (ampm === "AM" && hours === 12) {
      hours = 0;
    }

    targetDate.setHours(hours, minutes, 0, 0);
  } else {
    // Default to 8:30 PM (20:30)
    targetDate.setHours(20, 30, 0, 0);
  }

  return targetDate.toISOString();
}

interface CreatePlanScreenProps {
  setActiveTab: (tab: "home" | "plans" | "create" | "circles" | "wallet" | "profile") => void;
  triggerToast: (msg: string) => void;
  notifications: any[];
  setNotifications: React.Dispatch<React.SetStateAction<any[]>>;
}

export const CreatePlanScreen = ({
  setActiveTab,
  triggerToast,
  notifications,
  setNotifications
}: CreatePlanScreenProps) => {
  const { setPlans, setDbPlans, setDbPlanParticipants } = usePlansStore();
  const { userProfile, dbUsers, dbUserData } = useProfileStore();
  const activeUserId = userProfile?.user_id || "U001";
  const { circles, setCircles, dbCircleMembers } = useCirclesStore();

  // Spontaneous Create Form State (Legacy state supported for sync)
  const [newPlanCategory, setNewPlanCategory] = useState<string>("all");
  const [newPlanTitle, setNewPlanTitle] = useState("");
  const [newPlanLocation, setNewPlanLocation] = useState("");
  const [newPlanTime, setNewPlanTime] = useState("");
  const [newPlanCost, setNewPlanCost] = useState("0");

  // MVP Create Plan Flow Multi-step Stepper parameters
  const [createFlowStep, setCreateFlowStep] = useState<"BROWSE" | "DETAILS" | "RECIPIENTS" | "EXTRA" | "PREVIEW">("BROWSE");
  const [selectedExperience, setSelectedExperience] = useState<{
    id: string;
    title: string;
    category: "movies" | "sports" | "restaurants" | "custom";
    tag: string;
    description: string;
    time: string;
    venue: string;
    price: number;
    image: string;
  } | null>(null);

  // Audience tracking state parameters
  const [audienceType, setAudienceType] = useState<"circle" | "friends" | "multiple">("circle");
  const [recipientSearchQuery, setRecipientSearchQuery] = useState("");
  const [selectedCircleIds, setSelectedCircleIds] = useState<string[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [customPlanNotes, setCustomPlanNotes] = useState("");
  const [newPlanUploadedImage, setNewPlanUploadedImage] = useState<string | null>(null);
  const [aiVibePrompt, setAiVibePrompt] = useState("");
  const [isGeneratingAiPlan, setIsGeneratingAiPlan] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Planless MVP Pre-configured Experience Templates
  const suggestedExperiences = [
    {
      id: "exp_movies_1",
      title: "DUNE PART III (IMAX 4D)",
      category: "movies" as const,
      tag: "BLOCKBUSTER",
      description: "Spontaneous ticket grab for the visual masterpiece. Grab premium popcorn and join our movie discussion!",
      time: "TODAY • 9:30 PM",
      venue: "Luxe Cinemas, VR Chennai",
      price: 350,
      image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: "exp_movies_2",
      title: "CINÉPHILE INDIE CLASSICS",
      category: "movies" as const,
      tag: "INDIE NIGHT",
      description: "A curated curation of European cinema classics with film buffs. Spontaneous discussion over coffee follows.",
      time: "TOMORROW • 6:30 PM",
      venue: "Alliance Française, Nungambakkam",
      price: 150,
      image: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: "exp_sports_1",
      title: "SUNSET TURF FOOTBALL 7V7",
      category: "sports" as const,
      tag: "MATCHDAY MATCH",
      description: "Fast-paced 7-a-side match. Bibs, football and fresh water provided by the host. Just show up and play!",
      time: "TODAY • 8:00 PM",
      venue: "New Bel Road Turf Arena",
      price: 250,
      image: "https://images.unsplash.com/photo-1543351611-58f69d7c1781?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: "exp_sports_2",
      title: "BADMINTON DOUBLES SMASH",
      category: "sports" as const,
      tag: "SMASH RALLY",
      description: "Looking for two fast players to join us for a friendly doubles match on wooden court B. Non-marking shoes required.",
      time: "TODAY • 6:00 PM",
      venue: "Feathers Indoor Sports Club",
      price: 120,
      image: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: "exp_rest_1",
      title: "LATE NIGHT WAFFLES & COFFEE",
      category: "restaurants" as const,
      tag: "NIGHT RUN",
      description: "Late-night waffle craving run. Open discussions about life, work, design, and everything in between!",
      time: "TODAY • 11:30 PM",
      venue: "Glen's Bakehouse, New Bel Road",
      price: 200,
      image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: "exp_rest_2",
      title: "SPONTY RAMEN BOWLS CREW",
      category: "restaurants" as const,
      tag: "GOURMET ASIA",
      description: "Indulge in some authentic spicy miso ramen bowl and hot green tea with the foodie circle.",
      time: "TODAY • 8:30 PM",
      venue: "Writer's Cafe, VR Chennai",
      price: 450,
      image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: "exp_custom_1",
      title: "CUSTOM SPONTANEOUS EXPERIENCE",
      category: "custom" as const,
      tag: "SPONTANEOUS SPARK",
      description: "Start from scratch and build your own spontaneous coordinate. Customize title, timings, venue coordinates, and splits.",
      time: "TODAY • 8:30 PM",
      venue: "",
      price: 0,
      image: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=600"
    }
  ];

  const categoryCovers: Record<string, string> = {
    football: "https://images.unsplash.com/photo-1543351611-58f69d7c1781?auto=format&fit=crop&q=80&w=600",
    cafe: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=600",
    drink: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=600",
    sunset: "https://images.unsplash.com/photo-1472289065668-ce650ac443d2?auto=format&fit=crop&q=80&w=600",
    brunch: "https://images.unsplash.com/photo-1496042404372-601440b90453?auto=format&fit=crop&q=80&w=600",
    custom: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=600"
  };

  const handleAiGeneratePlan = async () => {
    if (!aiVibePrompt.trim()) return;
    setIsGeneratingAiPlan(true);
    try {
      const response = await fetch("/api/ai/coordinate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiVibePrompt })
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Failed to generate plan");
      }

      const planData = await response.json();

      // Populate standard detail form states
      setNewPlanTitle(planData.title || "");
      setNewPlanLocation(planData.location || "");
      setNewPlanTime(planData.time || "TODAY • 8:30 PM");
      setNewPlanCost((planData.cost ?? 0).toString());
      setNewPlanCategory(planData.category || "custom");
      setCustomPlanNotes(planData.notes || "");

      const customPreset = {
        id: `exp_ai_${Date.now()}`,
        title: planData.title || "AI Generated Plan",
        category: (planData.category || "custom") as any,
        tag: "AI SPARKED",
        description: planData.description || "A spontaneous social coordinate planned by AI.",
        time: planData.time || "TODAY • 8:30 PM",
        venue: planData.location || "Cozy venue",
        price: planData.cost || 0,
        image: {
          movies: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600",
          sports: "https://images.unsplash.com/photo-1543351611-58f69d7c1781?auto=format&fit=crop&w=600",
          restaurants: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600",
          custom: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=600"
        }[planData.category as "movies" | "sports" | "restaurants" | "custom"] || "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=600"
      };

      setSelectedExperience(customPreset as any);
      setCreateFlowStep("DETAILS");
      setAiVibePrompt("");
      triggerToast("✨ AI Coordinator has aligned details! Review below.");
    } catch (err: any) {
      console.error("AI Generation Error", err);
      triggerToast(`AI alignment error: ${err.message || "Ensure Secrets GEMINI_API_KEY is configured"}`);
    } finally {
      setIsGeneratingAiPlan(false);
    }
  };

  const handleHostPlanSubmit = async () => {
    console.log("[CreatePlanFlow] handleHostPlanSubmit triggered!");
    if (isSubmitting) {
      console.warn("[CreatePlanFlow] Submission blocked: already in progress");
      return;
    }
    setIsSubmitting(true);
    console.log("[CreatePlanFlow] selectedExperience:", selectedExperience);
    console.log("[CreatePlanFlow] userProfile:", userProfile);
    console.log("[CreatePlanFlow] activeUserId:", activeUserId);

    if (!selectedExperience) {
      console.warn("[CreatePlanFlow] Submission blocked: selectedExperience is missing");
      triggerToast("Please select an experience first.");
      return;
    }
    if (!userProfile) {
      console.warn("[CreatePlanFlow] Submission blocked: userProfile is missing");
      triggerToast("User profile session is not active. Onboard first.");
      return;
    }
    if (!activeUserId) {
      console.warn("[CreatePlanFlow] Submission blocked: activeUserId is missing");
      triggerToast("User identifier is missing. Onboard first.");
      return;
    }

    const titleToUse = (newPlanTitle || selectedExperience.title).trim();
    if (!titleToUse) {
      triggerToast("Experience title is required.");
      return;
    }

    const locationToUse = (newPlanLocation || selectedExperience.venue || "TBD Meetup Location").trim();
    const timeToUse = (newPlanTime || selectedExperience.time || "TODAY • 8:30 PM").trim();
    const costToUse = parseFloat(newPlanCost) || 0;

    const planId = `p_${Date.now()}`;
    const coverUrl = newPlanUploadedImage || selectedExperience.image || categoryCovers.custom;

    // Build the legacy UI Plan model for UI feeds compatibility
    const created: Plan = {
      id: planId,
      title: titleToUse.toUpperCase(),
      category: selectedExperience.category === "custom" ? "custom" : selectedExperience.category,
      date: "TODAY",
      time: timeToUse,
      location: locationToUse,
      cost: costToUse,
      confirmedCount: 1,
      coverImage: coverUrl,
      creatorId: activeUserId,
      creatorName: userProfile.name,
      creatorAvatar: userProfile.avatar,
      members: [
        {
          userId: activeUserId,
          name: userProfile.name,
          avatar: userProfile.avatar,
          joinState: "going",
          reminderState: "none",
          joinedAt: new Date().toISOString(),
          checkedIn: true
        }
      ],
      joinedUsers: [
        {
          userId: activeUserId,
          name: userProfile.name,
          avatar: userProfile.avatar,
          joinState: "going",
          reminderState: "none",
          joinedAt: new Date().toISOString(),
          checkedIn: true
        }
      ],
      timeline: "today",
      description: customPlanNotes.trim() || `Spontaneous coordination thread for ${titleToUse}`,
      circleId: audienceType === "circle" ? selectedCircleIds[0] || null : null,
      hostId: activeUserId,
      groupId: audienceType === "circle" ? selectedCircleIds[0] || null : null,
      paymentAmount: costToUse,
      status: "active",
      createdAt: new Date().toISOString(),
      waitlistUsers: [],
      interestedUsers: []
    };

    const matchedCircleObj = circles.find(c => c.id === selectedCircleIds[0]);
    const circleUuid = audienceType === "circle" ? (matchedCircleObj?.dbUuid || null) : null;

    const parsedIsoDateTime = parseSpontaneousDateTimeToIso(timeToUse);
    console.log("[CreatePlanFlow] Converted display datetime string:", timeToUse, "-> ISO timestamp:", parsedIsoDateTime);

    // Build Canonical DB DbPlan model
    const newDbPlan = {
      plan_id: planId,
      title: created.title,
      description: created.description || `Spontaneous coordination thread: ${created.title}`,
      created_by: userProfile.dbUuid, // References users.id UUID primary key
      circle_id: circleUuid, // References circles.id UUID primary key
      activity_type: created.category,
      location: created.location,
      datetime: parsedIsoDateTime, // Uses valid ISO 8601 format
      split_amount: created.cost,
      payment_required: created.cost > 0,
      status: "active" as const,
      created_at: new Date().toISOString(),
      cover_image: created.coverImage,
      notes: customPlanNotes.trim() || null
    };

    try {
      console.log("[CreatePlanFlow] Persisting plan to backend...", newDbPlan);
      const planRes = await fetch("/api/db/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "plans", records: [newDbPlan] })
      });
      if (!planRes.ok) {
        const errData = await planRes.json().catch(() => ({}));
        throw new Error(errData.error || errData.details || "Failed to write plan to backend database");
      }
      
      const planResult = await planRes.json();
      const dbPlanRow = planResult.data?.[0];
      const insertedPlanUuid = dbPlanRow?.id;
      
      console.log("[CreatePlanFlow] Plan saved, generated UUID primary key:", insertedPlanUuid);

      if (!insertedPlanUuid) {
        throw new Error("Backend did not return the generated UUID primary key for the new plan.");
      }

      // Collect selected invitees UUIDs
      const inviteeUuids: string[] = [];

      if (audienceType === "circle" && selectedCircleIds.length > 0) {
        const circleUuids = selectedCircleIds.map(cid => {
          const c = circles.find(x => x.id === cid);
          return c?.dbUuid || c?.id;
        });
        dbCircleMembers.forEach(m => {
          const matchesCircle = circleUuids.includes(m.circle_id);
          const isNotSelf = m.user_id !== userProfile.dbUuid;
          if (matchesCircle && isNotSelf && !inviteeUuids.includes(m.user_id)) {
            inviteeUuids.push(m.user_id);
          }
        });
      } else if (audienceType === "friends" && selectedFriendIds.length > 0) {
        selectedFriendIds.forEach(fid => {
          const friendUser = dbUsers.find(u => u.user_id === fid || u.id === fid);
          const friendUuid = friendUser ? friendUser.id : fid;
          if (friendUuid !== userProfile.dbUuid && !inviteeUuids.includes(friendUuid)) {
            inviteeUuids.push(friendUuid);
          }
        });
      } else if (audienceType === "multiple" && selectedCircleIds.length > 0) {
        const circleUuids = selectedCircleIds.map(cid => {
          const c = circles.find(x => x.id === cid);
          return c?.dbUuid || c?.id;
        });
        dbCircleMembers.forEach(m => {
          const matchesCircle = circleUuids.includes(m.circle_id);
          const isNotSelf = m.user_id !== userProfile.dbUuid;
          if (matchesCircle && isNotSelf && !inviteeUuids.includes(m.user_id)) {
            inviteeUuids.push(m.user_id);
          }
        });
      }

      console.log("[CreatePlanFlow] Selected invitees UUIDs:", inviteeUuids);

      // Build participant payload: 1 host (status: host) + N selected invitees (status: delivered)
      const participantRecords = [];
      const hostJoinedAt = new Date().toISOString();

      const ownerParticipant = {
        participant_id: `PP_${Date.now()}_self`,
        plan_id: insertedPlanUuid, // Reference plans.id UUID
        user_id: userProfile.dbUuid, // Reference users.id UUID
        status: "host" as const,
        payment_status: "paid" as const,
        joined_at: hostJoinedAt
      };
      participantRecords.push(ownerParticipant);

      inviteeUuids.forEach((inviteeUuid, idx) => {
        participantRecords.push({
          participant_id: `PP_${Date.now()}_invitee_${idx}`,
          plan_id: insertedPlanUuid, // Reference plans.id UUID
          user_id: inviteeUuid, // Reference users.id UUID
          status: "delivered" as const,
          payment_status: "unpaid" as const,
          joined_at: new Date().toISOString()
        });
      });

      console.log("[CreatePlanFlow] Participant insert payload:", JSON.stringify(participantRecords, null, 2));
      console.log("[CreatePlanFlow] Final participant count:", participantRecords.length);

      console.log("[CreatePlanFlow] Persisting participants list to backend...", participantRecords);
      const partRes = await fetch("/api/db/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "plan_participants", records: participantRecords })
      });
      if (!partRes.ok) {
        const errData = await partRes.json().catch(() => ({}));
        throw new Error(errData.error || errData.details || "Failed to write participants to backend database");
      }

      const partResult = await partRes.json();
      const dbPartRow = partResult.data?.[0];

      // Build and insert notifications for all invited friends or circle members
      const inviteNotifications = [];
      inviteeUuids.forEach(friendUuid => {
        inviteNotifications.push({
          user_id: friendUuid,
          type: "invitation",
          title: `${userProfile.name} invited you to join "${titleToUse}"`,
          body: `Spontaneous meetup invitation`,
          reference_id: insertedPlanUuid,
          is_read: false,
          created_at: new Date().toISOString()
        });
      });

      if (inviteNotifications.length > 0) {
        console.log("[CreatePlanFlow] Persisting invitations to backend...", inviteNotifications);
        await fetch("/api/db/upsert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: "notifications", records: inviteNotifications })
        });
      }

      // Update statistics: increment user's plans_created statistic
      if (userProfile.dbUuid) {
        await syncUserStats(userProfile.dbUuid, "create_plan");
      }

      console.log("[CreatePlanFlow] Successfully saved plan, participant and invitations in backend!");

      // Map members for local state update
      const localMembers = [
        {
          userId: userProfile.user_id,
          name: userProfile.name,
          avatar: userProfile.avatar,
          joinState: "host" as any,
          reminderState: "none" as const,
          joinedAt: hostJoinedAt,
          checkedIn: true
        }
      ];

      inviteeUuids.forEach(uuid => {
        const u = dbUsers.find(user => user.id === uuid || user.user_id === uuid);
        if (u) {
          localMembers.push({
            userId: u.user_id,
            name: u.full_name,
            avatar: u.profile_photo,
            joinState: "delivered" as any,
            reminderState: "none" as const,
            joinedAt: new Date().toISOString(),
            checkedIn: false
          });
        }
      });

      // Update frontend local Context Stores (hydrating state with mapped objects)
      setPlans(prev => [
        {
          ...created,
          dbUuid: insertedPlanUuid,
          creatorId: userProfile.dbUuid,
          hostId: userProfile.dbUuid,
          members: localMembers,
          joinedUsers: localMembers
        },
        ...prev
      ]);
      setDbPlans(prev => [dbPlanRow, ...prev]);
      setDbPlanParticipants(prev => [dbPartRow, ...prev]);

      // Create new circle activity trigger
      const matchedCircleId = audienceType === "circle" ? selectedCircleIds[0] : null;
      if (matchedCircleId) {
        setCircles(prev => prev.map(c => c.id === matchedCircleId ? {
          ...c,
          lastSpontaneousActivity: `Spawned ${titleToUse} just now`
        } : c));
      }

      // Trigger spontaneous app activity log details under Notifications
      const newNotif: NotificationItem = {
        id: `n_${Date.now()}`,
        type: "general",
        title: `You spawned spontaneous hanging "${titleToUse}" at ${locationToUse}`,
        relativeTime: "1s"
      };
      setNotifications([newNotif, ...notifications]);

      // Reset Form
      setNewPlanTitle("");
      setNewPlanLocation("");
      setNewPlanTime("");
      setNewPlanCost("0");
      setSelectedCircleIds([]);
      setSelectedFriendIds([]);
      setCustomPlanNotes("");
      setNewPlanUploadedImage(null);
      setSelectedExperience(null);
      setCreateFlowStep("BROWSE");
      setIsSubmitting(false);

      // Route to Circles & Notify
      setActiveTab("circles");
      triggerToast("✨ Spontaneous Plan Spawned successfully!");
    } catch (err: any) {
      console.error("[CreatePlanFlow] Database persistence failure:", err);
      setIsSubmitting(false);
      triggerToast(`Database save failed: ${err.message || "Unknown error"}`);
    }
  };

  return (
    <div id="create_tab_pane" className="space-y-5 animate-fade-in max-w-sm mx-auto">
      {/* MVP Stepper Progress Indicator */}
      <div className="flex items-center justify-between bg-zinc-950/40 border border-zinc-900 rounded-2xl p-3 mb-1 select-none">
        {[
          { step: "BROWSE" as const, label: "Custom" },
          { step: "DETAILS" as const, label: "Info" },
          { step: "RECIPIENTS" as const, label: "Invite" },
          { step: "EXTRA" as const, label: "Setups" },
          { step: "PREVIEW" as const, label: "Host" }
        ].map((s, idx) => {
          const stepOrder = ["BROWSE", "DETAILS", "RECIPIENTS", "EXTRA", "PREVIEW"] as const;
          const currentIdx = stepOrder.indexOf(createFlowStep);
          const active = s.step === createFlowStep;
          const done = stepOrder.indexOf(s.step) < currentIdx;
          return (
            <React.Fragment key={s.step}>
              <button
                type="button"
                disabled={!done && stepOrder.indexOf(s.step) > currentIdx}
                onClick={() => setCreateFlowStep(s.step as any)}
                className="flex items-center gap-1.5 focus:outline-none cursor-pointer text-left"
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-mono font-bold transition-all ${active
                  ? "bg-[#ff8b66] text-black ring-4 ring-[#ff8b66]/20 font-extrabold"
                  : done
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-900"
                    : "bg-zinc-900 text-zinc-550 border border-zinc-850"
                  }`}>
                  {done ? "✓" : idx + 1}
                </span>
                <span className={`text-[10px] font-mono tracking-tighter ${active ? "text-[#ff8b66] font-semibold" : "text-zinc-550"
                  }`}>
                  {s.label}
                </span>
              </button>
              {idx < 4 && (
                <div className={`flex-1 h-[1px] mx-1 ${stepOrder.indexOf(s.step) < currentIdx ? "bg-emerald-900" : "bg-zinc-900"
                  }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* RENDER STEP PANEL */}
      {createFlowStep === "BROWSE" && (
        <BrowseExperiencesStep
          aiVibePrompt={aiVibePrompt}
          setAiVibePrompt={setAiVibePrompt}
          isGeneratingAiPlan={isGeneratingAiPlan}
          handleAiGeneratePlan={handleAiGeneratePlan}
          setSelectedExperience={setSelectedExperience}
          setNewPlanTitle={setNewPlanTitle}
          setNewPlanLocation={setNewPlanLocation}
          setNewPlanTime={setNewPlanTime}
          setNewPlanCost={setNewPlanCost}
          setCreateFlowStep={setCreateFlowStep}
          newPlanCategory={newPlanCategory}
          setNewPlanCategory={setNewPlanCategory}
          suggestedExperiences={suggestedExperiences}
        />
      )}

      {createFlowStep === "DETAILS" && selectedExperience && (
        <PlanDetailsStep
          newPlanTitle={newPlanTitle}
          setNewPlanTitle={setNewPlanTitle}
          newPlanLocation={newPlanLocation}
          setNewPlanLocation={setNewPlanLocation}
          newPlanTime={newPlanTime}
          setNewPlanTime={setNewPlanTime}
          setCreateFlowStep={setCreateFlowStep}
          triggerToast={triggerToast}
        />
      )}

      {createFlowStep === "RECIPIENTS" && (
        <InviteRecipientsStep
          audienceType={audienceType}
          setAudienceType={setAudienceType}
          recipientSearchQuery={recipientSearchQuery}
          setRecipientSearchQuery={setRecipientSearchQuery}
          selectedCircleIds={selectedCircleIds}
          setSelectedCircleIds={setSelectedCircleIds}
          selectedFriendIds={selectedFriendIds}
          setSelectedFriendIds={setSelectedFriendIds}
          circles={circles}
          dbUsers={dbUsers}
          activeUserId={activeUserId}
          setCreateFlowStep={setCreateFlowStep}
          triggerToast={triggerToast}
          dbUserData={dbUserData}
        />
      )}

      {createFlowStep === "EXTRA" && selectedExperience && (
        <ExtraSettingsStep
          customPlanNotes={customPlanNotes}
          setCustomPlanNotes={setCustomPlanNotes}
          newPlanCost={newPlanCost}
          setNewPlanCost={setNewPlanCost}
          setCreateFlowStep={setCreateFlowStep}
        />
      )}

      {createFlowStep === "PREVIEW" && selectedExperience && (
        <PlanPreviewStep
          newPlanTitle={newPlanTitle}
          newPlanLocation={newPlanLocation}
          newPlanTime={newPlanTime}
          newPlanCost={newPlanCost}
          audienceType={audienceType}
          selectedCircleIds={selectedCircleIds}
          selectedFriendIds={selectedFriendIds}
          circles={circles}
          customPlanNotes={customPlanNotes}
          newPlanUploadedImage={newPlanUploadedImage}
          setNewPlanUploadedImage={setNewPlanUploadedImage}
          selectedExperience={selectedExperience}
          setCreateFlowStep={setCreateFlowStep}
          handleHostPlanSubmit={handleHostPlanSubmit}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
};

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

// Import custom step components
import { CustomNameStep } from "../components/CustomNameStep";
import { CustomLocationStep } from "../components/CustomLocationStep";
import { CustomDateTimeStep } from "../components/CustomDateTimeStep";
import { CustomExtraSettingsStep } from "../components/CustomExtraSettingsStep";

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
  const { setPlans, setDbPlans, setDbPlanParticipants, refreshPlans } = usePlansStore();
  const { userProfile, dbUsers, dbUserData } = useProfileStore();
  const activeUserId = userProfile?.user_id || "U001";
  const { circles, setCircles, dbCircleMembers } = useCirclesStore();

  // Spontaneous Create Form State (Legacy state supported for sync)
  const [newPlanCategory, setNewPlanCategory] = useState<string>("all");
  const [newPlanTitle, setNewPlanTitle] = useState("");
  const [newPlanLocation, setNewPlanLocation] = useState("");
  const [newPlanTime, setNewPlanTime] = useState("");
  const [newPlanIsoDateTime, setNewPlanIsoDateTime] = useState("");
  const [newPlanCost, setNewPlanCost] = useState("0");

  // MVP Create Plan Flow Multi-step Stepper parameters
  const [createFlowStep, setCreateFlowStep] = useState<
    "BROWSE" | "DETAILS" | "RECIPIENTS" | "EXTRA" | "PREVIEW" |
    "CUSTOM_NAME" | "CUSTOM_LOCATION" | "CUSTOM_DATETIME" | "CUSTOM_RECIPIENTS" | "CUSTOM_EXTRA"
  >("BROWSE");
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
  const [waitlistEnabled, setWaitlistEnabled] = useState(false);
  const [joinLimit, setJoinLimit] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Immersive navigation scrolling behavior for Create Page
  React.useEffect(() => {
    if (createFlowStep !== "BROWSE") {
      const footer = document.getElementById("main_app_footer_nav");
      if (footer) {
        footer.style.transform = "";
        footer.style.marginBottom = "";
        footer.style.transition = "";
      }
      return;
    }

    const container = document.getElementById("app_tab_content_wrapper");
    const footer = document.getElementById("main_app_footer_nav");
    if (!container || !footer) return;

    // Apply smooth transitions
    footer.style.transition = "transform 250ms cubic-bezier(0.4, 0, 0.2, 1), margin-bottom 250ms cubic-bezier(0.4, 0, 0.2, 1)";

    let lastScrollTop = container.scrollTop;
    let accumulatedDistance = 0;
    let isHidden = false;
    let prevDirection: "up" | "down" | null = null;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const scrollDiff = scrollTop - lastScrollTop;

      // TOP OF SCREEN RULE: Always show at the top of the Create page
      if (scrollTop <= 0) {
        if (isHidden) {
          footer.style.transform = "translateY(0)";
          footer.style.marginBottom = "0px";
          isHidden = false;
        }
        lastScrollTop = 0;
        accumulatedDistance = 0;
        return;
      }

      const currentDirection = scrollDiff > 0 ? "down" : "up";
      if (currentDirection !== prevDirection) {
        accumulatedDistance = 0;
      }
      prevDirection = currentDirection;
      accumulatedDistance += scrollDiff;

      if (currentDirection === "down") {
        if (accumulatedDistance > 50 && !isHidden) {
          footer.style.transform = "translateY(100%)";
          footer.style.marginBottom = "-72px";
          isHidden = true;
        }
      } else {
        if (accumulatedDistance < -30 && isHidden) {
          footer.style.transform = "translateY(0)";
          footer.style.marginBottom = "0px";
          isHidden = false;
        }
      }

      lastScrollTop = scrollTop;
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      footer.style.transform = "";
      footer.style.marginBottom = "";
      footer.style.transition = "";
    };
  }, [createFlowStep]);


  const suggestedExperiences: any[] = [];

  const categoryCovers: Record<string, string> = {
    football: "https://images.unsplash.com/photo-1543351611-58f69d7c1781?auto=format&fit=crop&q=80&w=600",
    cafe: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=600",
    drink: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=600",
    sunset: "https://images.unsplash.com/photo-1472289065668-ce650ac443d2?auto=format&fit=crop&q=80&w=600",
    brunch: "https://images.unsplash.com/photo-1496042404372-601440b90453?auto=format&fit=crop&q=80&w=600",
    custom: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=600"
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
      waitlistEnabled: waitlistEnabled,
      joinLimit: waitlistEnabled ? joinLimit : undefined,
      capacity: waitlistEnabled ? joinLimit : undefined,
      waitlistUsers: [],
      interestedUsers: []
    };

    const matchedCircleObj = circles.find(c => c.id === selectedCircleIds[0]);
    const circleUuid = audienceType === "circle" ? (matchedCircleObj?.dbUuid || null) : null;

    const parsedIsoDateTime = newPlanIsoDateTime || parseSpontaneousDateTimeToIso(timeToUse);
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
      notes: customPlanNotes.trim() || null,
      waitlist_enabled: waitlistEnabled,
      join_limit: waitlistEnabled ? joinLimit : null
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

      // 1. Fetch fresh DB snapshot to avoid relying on stale local states
      const freshRes = await fetch("/api/db/fetch-all");
      if (!freshRes.ok) {
        throw new Error("Failed to fetch fresh database snapshot.");
      }
      const freshJson = await freshRes.json();
      const freshCircles = freshJson?.data?.circles || [];
      const freshCircleMembers = freshJson?.data?.circle_members || [];
      const freshPlanParticipants = freshJson?.data?.plan_participants || [];
      // freshUsers contains raw DB rows with BOTH user_id (short ID) AND id (Postgres UUID)
      const freshUsers = freshJson?.data?.users || [];
      console.log("[CreatePlanFlow] freshUsers loaded:", freshUsers.length, "rows");

      // Collect selected invitees UUIDs
      const inviteeUuids: string[] = [];
      const participantRecords: any[] = [];
      const hostJoinedAt = new Date().toISOString();

      if ((audienceType === "circle" || audienceType === "multiple") && selectedCircleIds.length > 0) {
        const circleUuids = selectedCircleIds.map(cid => {
          const c = freshCircles.find((x: any) => x.circle_id === cid || x.id === cid);
          return c?.id || cid;
        });

        // Retrieve fresh circle members directly from database matching selected circleUUIDs
        const targetMembers = freshCircleMembers.filter((m: any) => circleUuids.includes(m.circle_id));
        
        // Log circle details as required by Step 7
        console.log(`[CreatePlan] Selected circle_id:`, selectedCircleIds[0]);
        console.log(`[CreatePlan] Resolved Circle UUIDs:`, circleUuids);
        console.log(`[CreatePlan] Circle member count: ${targetMembers.length}`);
        console.log(`[CreatePlan] Circle member ids:`, targetMembers.map((m: any) => m.user_id));
        console.log(`[CreatePlan] Created plan UUID:`, insertedPlanUuid);

        // Deduplicate circle members by user_id to prevent duplicates (Step 5)
        const uniqueMembersMap = new Map();
        targetMembers.forEach((m: any) => {
          uniqueMembersMap.set(m.user_id, m);
        });

        // Always ensure host is in the mapping to guarantee they get a record
        if (userProfile.dbUuid) {
          uniqueMembersMap.set(userProfile.dbUuid, {
            circle_id: circleUuids[0],
            user_id: userProfile.dbUuid,
            role: "admin"
          });
        }

        const uniqueMembers = Array.from(uniqueMembersMap.values());

        // Create plan_participants records for each unique circle member
        uniqueMembers.forEach((m: any, idx) => {
          const isHost = m.user_id === userProfile.dbUuid;
          participantRecords.push({
            participant_id: `PP_${Date.now()}_member_${idx}`,
            plan_id: insertedPlanUuid,
            user_id: m.user_id,
            status: isHost ? ("host" as const) : ("delivered" as const),
            payment_status: "unpaid" as const, // Step 3: payment_status = unpaid
            joined_at: isHost ? hostJoinedAt : new Date().toISOString()
          });

          if (!isHost) {
            inviteeUuids.push(m.user_id);
          }
        });

        // Verify: Number of participant records equals number of unique circle members
        console.log(`[CreatePlan Participant Verification]`);
        console.log(`- circle_id:`, circleUuids[0]);
        console.log(`- member count: ${uniqueMembers.length}`);
        console.log(`- participant count: ${participantRecords.length}`);
        console.log(`- participant user_ids:`, participantRecords.map(pr => pr.user_id));
      } else if (audienceType === "friends" && selectedFriendIds.length > 0) {
        // selectedFriendIds contains short IDs (e.g. "U001").
        // We must look up the Postgres UUID from freshUsers (raw DB rows with both user_id and id).
        console.log("[CreatePlan:Custom] Selected friend short IDs:", selectedFriendIds);
        console.log("[CreatePlan:Custom] Host UUID:", userProfile.dbUuid);

        selectedFriendIds.forEach(fid => {
          // Look up in freshUsers (raw DB rows) which have BOTH user_id AND id (UUID)
          const freshFriendRow = freshUsers.find((u: any) => u.user_id === fid || u.id === fid);
          const friendUuid = freshFriendRow?.id || null;
          console.log(`[CreatePlan:Custom] Resolving friend short_id=${fid} -> UUID=${friendUuid} (found=${!!freshFriendRow})`);
          if (friendUuid && friendUuid !== userProfile.dbUuid && !inviteeUuids.includes(friendUuid)) {
            inviteeUuids.push(friendUuid);
          } else if (!friendUuid) {
            console.warn(`[CreatePlan:Custom] Could not resolve UUID for friend short_id=${fid}. Skipping.`);
          }
        });

        console.log("[CreatePlan:Custom] Resolved invitee UUIDs:", inviteeUuids);

        // Build participant payload for friends audience: 1 host + N invitees
        const ownerParticipant = {
          participant_id: `PP_${Date.now()}_self`,
          plan_id: insertedPlanUuid,
          user_id: userProfile.dbUuid,
          status: "host" as const,
          payment_status: "paid" as const,
          joined_at: hostJoinedAt
        };
        participantRecords.push(ownerParticipant);
        console.log("[CreatePlan:Custom] Host participant record:", ownerParticipant);

        inviteeUuids.forEach((inviteeUuid, idx) => {
          const rec = {
            participant_id: `PP_${Date.now()}_invitee_${idx}`,
            plan_id: insertedPlanUuid,
            user_id: inviteeUuid,
            status: "delivered" as const,
            payment_status: "unpaid" as const,
            joined_at: new Date().toISOString()
          };
          participantRecords.push(rec);
          console.log(`[CreatePlan:Custom] Invitee participant record [${idx}]:`, rec);
        });

        console.log(`[CreatePlan:Custom] Total participant records: ${participantRecords.length} (1 host + ${inviteeUuids.length} invitees)`);
      } else {
        // Fallback: just insert host
        const ownerParticipant = {
          participant_id: `PP_${Date.now()}_self`,
          plan_id: insertedPlanUuid,
          user_id: userProfile.dbUuid,
          status: "host" as const,
          payment_status: "paid" as const,
          joined_at: hostJoinedAt
        };
        participantRecords.push(ownerParticipant);
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isUuid = (val: any) => typeof val === "string" && uuidRegex.test(val);

      // Filter out invalid/non-UUID user_ids from participantRecords
      const validParticipantRecords = participantRecords.filter(rec => {
        if (!rec.user_id || !isUuid(rec.user_id)) {
          console.error(`[CreatePlan] Skipping participant insert: user_id is missing or not a valid UUID:`, rec.user_id);
          return false;
        }
        return true;
      });

      // Deduplicate participant records against existing records in DB snapshot (by plan_id, user_id)
      const filteredParticipantRecords = validParticipantRecords.filter(rec => {
        const duplicateInDb = freshPlanParticipants.some((p: any) => 
          p.plan_id === rec.plan_id && p.user_id === rec.user_id
        );
        return !duplicateInDb;
      });

      // Step 6 logging
      console.log(`[CreatePlan] plan id:`, insertedPlanUuid);
      console.log(`[CreatePlan] invited user ids:`, inviteeUuids);
      console.log(`[CreatePlan] participant records created:`, filteredParticipantRecords);

      let dbPartRow = null;
      if (filteredParticipantRecords.length > 0) {
        console.log("[CreatePlanFlow] Persisting participants list to backend...", filteredParticipantRecords);
        const partRes = await fetch("/api/db/upsert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: "plan_participants", records: filteredParticipantRecords })
        });
        if (!partRes.ok) {
          const errData = await partRes.json().catch(() => ({}));
          throw new Error(errData.error || errData.details || "Failed to write participants to backend database");
        }
        const partResult = await partRes.json();
        dbPartRow = partResult.data?.[0];
      }

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

      // Force reload plans state immediately from database to sync all stores
      await refreshPlans();

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
      if (dbPartRow) {
        setDbPlanParticipants(prev => [dbPartRow, ...prev]);
      }

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
      setNewPlanIsoDateTime("");
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
      {/* RENDER STEP PANEL */}
      {createFlowStep === "BROWSE" && (
        <BrowseExperiencesStep
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
          setNewPlanIsoDateTime={setNewPlanIsoDateTime}
          setCreateFlowStep={setCreateFlowStep}
          triggerToast={triggerToast}
        />
      )}

      {/* CUSTOM FLOW STEP 1: ACTIVITY NAME */}
      {createFlowStep === "CUSTOM_NAME" && selectedExperience && (
        <CustomNameStep
          newPlanTitle={newPlanTitle}
          setNewPlanTitle={setNewPlanTitle}
          setCreateFlowStep={setCreateFlowStep}
        />
      )}

      {/* CUSTOM FLOW STEP 2: LOCATION */}
      {createFlowStep === "CUSTOM_LOCATION" && selectedExperience && (
        <CustomLocationStep
          newPlanLocation={newPlanLocation}
          setNewPlanLocation={setNewPlanLocation}
          setCreateFlowStep={setCreateFlowStep}
        />
      )}

      {/* CUSTOM FLOW STEP 3: DATE & TIME */}
      {createFlowStep === "CUSTOM_DATETIME" && selectedExperience && (
        <CustomDateTimeStep
          newPlanTime={newPlanTime}
          setNewPlanTime={setNewPlanTime}
          setNewPlanIsoDateTime={setNewPlanIsoDateTime}
          setCreateFlowStep={setCreateFlowStep}
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
          waitlistEnabled={waitlistEnabled}
          setWaitlistEnabled={setWaitlistEnabled}
          joinLimit={joinLimit}
          setJoinLimit={setJoinLimit}
        />
      )}

      {/* CUSTOM FLOW STEP 4: INVITED PEOPLE */}
      {createFlowStep === "CUSTOM_RECIPIENTS" && (
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
          waitlistEnabled={waitlistEnabled}
          setWaitlistEnabled={setWaitlistEnabled}
          joinLimit={joinLimit}
          setJoinLimit={setJoinLimit}
          onBack={() => setCreateFlowStep("CUSTOM_DATETIME")}
          onNext={() => setCreateFlowStep("CUSTOM_EXTRA")}
          hideWaitlist={true}
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

      {/* CUSTOM FLOW STEP 5: OPTIONAL DETAILS */}
      {createFlowStep === "CUSTOM_EXTRA" && selectedExperience && (
        <CustomExtraSettingsStep
          customPlanNotes={customPlanNotes}
          setCustomPlanNotes={setCustomPlanNotes}
          newPlanCost={newPlanCost}
          setNewPlanCost={setNewPlanCost}
          waitlistEnabled={waitlistEnabled}
          setWaitlistEnabled={setWaitlistEnabled}
          joinLimit={joinLimit}
          setJoinLimit={setJoinLimit}
          selectedCircleIds={selectedCircleIds}
          selectedFriendIds={selectedFriendIds}
          circles={circles}
          audienceType={audienceType}
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
          onBack={() => setCreateFlowStep(selectedExperience.category === "custom" ? "CUSTOM_EXTRA" : "EXTRA")}
        />
      )}
    </div>
  );
};

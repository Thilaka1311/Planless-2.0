import React, { useState } from "react";
import { usePlansStore } from "../../plans/state/PlansContext";
import { useProfileStore } from "../../profile/state/ProfileContext";
import { useCirclesStore } from "../../circles/state/CirclesContext";
import { Plan, DbPlan, DbPlanParticipant, NotificationItem } from "../../../core/types";
import { syncUserStats } from "../../../lib/db";

// MVP 6-step Create Flow components
import { WhatStep } from "../components/active/WhatStep";
import { CustomLocationStep } from "../components/CustomLocationStep";
import { CustomDateTimeStep } from "../components/CustomDateTimeStep";
import { InviteRecipientsStep } from "../components/active/InviteRecipientsStep";
import { CostStep } from "../components/CostStep";
import { PlanPreviewStep } from "../components/active/PlanPreviewStep";

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

  const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM)?/;
  const match = normalized.match(timeRegex);

  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3];
    if (ampm === "PM" && hours < 12) hours += 12;
    else if (ampm === "AM" && hours === 12) hours = 0;
    targetDate.setHours(hours, minutes, 0, 0);
  } else {
    targetDate.setHours(20, 30, 0, 0);
  }

  return targetDate.toISOString();
}

type CreateFlowStep = "WHAT" | "LOCATION" | "DATETIME" | "WHO" | "COST" | "REVIEW";

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
  setNotifications,
}: CreatePlanScreenProps) => {
  const { setPlans, setDbPlans, setDbPlanParticipants, refreshPlans } = usePlansStore();
  const { userProfile, dbUsers, dbUserData } = useProfileStore();
  const activeUserId = userProfile?.user_id || "U001";
  const { circles, setCircles } = useCirclesStore();

  // ── Step state ────────────────────────────────────────────
  const [createFlowStep, setCreateFlowStep] = useState<CreateFlowStep>("WHAT");

  // ── Plan fields ───────────────────────────────────────────
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [newPlanTitle, setNewPlanTitle] = useState("");
  const [newPlanLocation, setNewPlanLocation] = useState("");
  const [newPlanTime, setNewPlanTime] = useState("");
  const [newPlanIsoDateTime, setNewPlanIsoDateTime] = useState("");
  const [newPlanCost, setNewPlanCost] = useState("0");
  const [customPlanNotes, setCustomPlanNotes] = useState("");
  const [newPlanUploadedImage, setNewPlanUploadedImage] = useState<string | null>(null);

  // ── Audience ──────────────────────────────────────────────
  const [audienceType, setAudienceType] = useState<"circle" | "friends" | "multiple">("circle");
  const [recipientSearchQuery, setRecipientSearchQuery] = useState("");
  const [selectedCircleIds, setSelectedCircleIds] = useState<string[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [waitlistEnabled, setWaitlistEnabled] = useState(false);
  const [joinLimit, setJoinLimit] = useState(10);

  // ── Experience (category metadata for submit) ─────────────
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

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Category cover fallback ───────────────────────────────
  const categoryCovers: Record<string, string> = {
    sports: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80",
    movies: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80",
    restaurants: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80",
    custom: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=600&q=80",
  };

  // ── Submit ────────────────────────────────────────────────
  const handleHostPlanSubmit = async () => {
    console.log("[CreatePlanFlow] handleHostPlanSubmit triggered!");
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (!selectedExperience) {
      triggerToast("Please select an activity first.");
      setIsSubmitting(false);
      return;
    }
    if (!userProfile) {
      triggerToast("User profile session is not active. Onboard first.");
      setIsSubmitting(false);
      return;
    }
    if (!activeUserId) {
      triggerToast("User identifier is missing. Onboard first.");
      setIsSubmitting(false);
      return;
    }

    const titleToUse = (newPlanTitle || selectedExperience.title).trim();
    if (!titleToUse) {
      triggerToast("Plan title is required.");
      setIsSubmitting(false);
      return;
    }

    const locationToUse = (newPlanLocation || "TBD Meetup Location").trim();
    const timeToUse = (newPlanTime || "TODAY • 8:30 PM").trim();
    const costToUse = parseFloat(newPlanCost) || 0;

    const planId = `p_${Date.now()}`;
    const coverUrl = newPlanUploadedImage || selectedExperience.image || categoryCovers[selectedExperience.category] || categoryCovers.custom;

    const created: Plan = {
      id: planId,
      title: titleToUse.toUpperCase(),
      category: selectedExperience.category,
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
          checkedIn: true,
        },
      ],
      joinedUsers: [
        {
          userId: activeUserId,
          name: userProfile.name,
          avatar: userProfile.avatar,
          joinState: "going",
          reminderState: "none",
          joinedAt: new Date().toISOString(),
          checkedIn: true,
        },
      ],
      timeline: "today",
      description: customPlanNotes.trim() || `Spontaneous coordination thread for ${titleToUse}`,
      circleId: audienceType === "circle" ? selectedCircleIds[0] || null : null,
      hostId: activeUserId,
      groupId: audienceType === "circle" ? selectedCircleIds[0] || null : null,
      paymentAmount: costToUse,
      status: "active",
      createdAt: new Date().toISOString(),
      waitlistEnabled,
      joinLimit: waitlistEnabled ? joinLimit : undefined,
      capacity: waitlistEnabled ? joinLimit : undefined,
      waitlistUsers: [],
      interestedUsers: [],
    };

    const matchedCircleObj = circles.find((c) => c.id === selectedCircleIds[0]);
    const circleUuid = audienceType === "circle" ? (matchedCircleObj?.dbUuid || null) : null;
    const parsedIsoDateTime = newPlanIsoDateTime || parseSpontaneousDateTimeToIso(timeToUse);

    const newDbPlan = {
      plan_id: planId,
      title: created.title,
      description: created.description || `Coordination thread: ${created.title}`,
      created_by: userProfile.dbUuid,
      circle_id: circleUuid,
      activity_type: created.category,
      location: created.location,
      datetime: parsedIsoDateTime,
      split_amount: created.cost,
      payment_required: created.cost > 0,
      status: "active" as const,
      created_at: new Date().toISOString(),
      cover_image: created.coverImage,
      notes: customPlanNotes.trim() || null,
      waitlist_enabled: waitlistEnabled,
      join_limit: waitlistEnabled ? joinLimit : null,
    };

    try {
      const planRes = await fetch("/api/db/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "plans", records: [newDbPlan] }),
      });
      if (!planRes.ok) {
        const errData = await planRes.json().catch(() => ({}));
        throw new Error(errData.error || errData.details || "Failed to write plan to backend database");
      }

      const planResult = await planRes.json();
      const dbPlanRow = planResult.data?.[0];
      const insertedPlanUuid = dbPlanRow?.id;

      if (!insertedPlanUuid) {
        throw new Error("Backend did not return the generated UUID for the new plan.");
      }

      // Fresh DB snapshot for UUID resolution
      const freshRes = await fetch("/api/db/fetch-all");
      if (!freshRes.ok) throw new Error("Failed to fetch fresh database snapshot.");
      const freshJson = await freshRes.json();
      const freshCircles = freshJson?.data?.circles || [];
      const freshCircleMembers = freshJson?.data?.circle_members || [];
      const freshPlanParticipants = freshJson?.data?.plan_participants || [];
      const freshUsers = freshJson?.data?.users || [];

      const inviteeUuids: string[] = [];
      const participantRecords: any[] = [];
      const hostJoinedAt = new Date().toISOString();

      if ((audienceType === "circle" || audienceType === "multiple") && selectedCircleIds.length > 0) {
        const circleUuids = selectedCircleIds.map((cid) => {
          const c = freshCircles.find((x: any) => x.circle_id === cid || x.id === cid);
          return c?.id || cid;
        });
        const targetMembers = freshCircleMembers.filter((m: any) => circleUuids.includes(m.circle_id));
        const uniqueMembersMap = new Map();
        targetMembers.forEach((m: any) => uniqueMembersMap.set(m.user_id, m));
        if (userProfile.dbUuid) {
          uniqueMembersMap.set(userProfile.dbUuid, { circle_id: circleUuids[0], user_id: userProfile.dbUuid, role: "admin" });
        }
        Array.from(uniqueMembersMap.values()).forEach((m: any, idx) => {
          const isHost = m.user_id === userProfile.dbUuid;
          participantRecords.push({
            participant_id: `PP_${Date.now()}_member_${idx}`,
            plan_id: insertedPlanUuid,
            user_id: m.user_id,
            status: isHost ? "host" : "delivered",
            payment_status: "unpaid",
            joined_at: isHost ? hostJoinedAt : new Date().toISOString(),
          });
          if (!isHost) inviteeUuids.push(m.user_id);
        });
      } else if (audienceType === "friends" && selectedFriendIds.length > 0) {
        participantRecords.push({
          participant_id: `PP_${Date.now()}_self`,
          plan_id: insertedPlanUuid,
          user_id: userProfile.dbUuid,
          status: "host",
          payment_status: "paid",
          joined_at: hostJoinedAt,
        });
        selectedFriendIds.forEach((fid, idx) => {
          const freshFriendRow = freshUsers.find((u: any) => u.user_id === fid || u.id === fid);
          const friendUuid = freshFriendRow?.id || null;
          if (friendUuid && friendUuid !== userProfile.dbUuid && !inviteeUuids.includes(friendUuid)) {
            inviteeUuids.push(friendUuid);
            participantRecords.push({
              participant_id: `PP_${Date.now()}_invitee_${idx}`,
              plan_id: insertedPlanUuid,
              user_id: friendUuid,
              status: "delivered",
              payment_status: "unpaid",
              joined_at: new Date().toISOString(),
            });
          }
        });
      } else {
        participantRecords.push({
          participant_id: `PP_${Date.now()}_self`,
          plan_id: insertedPlanUuid,
          user_id: userProfile.dbUuid,
          status: "host",
          payment_status: "paid",
          joined_at: hostJoinedAt,
        });
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validParticipantRecords = participantRecords.filter(
        (rec) => rec.user_id && uuidRegex.test(rec.user_id)
      );
      const filteredParticipantRecords = validParticipantRecords.filter(
        (rec) => !freshPlanParticipants.some((p: any) => p.plan_id === rec.plan_id && p.user_id === rec.user_id)
      );

      let dbPartRow = null;
      if (filteredParticipantRecords.length > 0) {
        const partRes = await fetch("/api/db/upsert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: "plan_participants", records: filteredParticipantRecords }),
        });
        if (!partRes.ok) {
          const errData = await partRes.json().catch(() => ({}));
          throw new Error(errData.error || errData.details || "Failed to write participants");
        }
        const partResult = await partRes.json();
        dbPartRow = partResult.data?.[0];
      }

      // Notifications
      const inviteNotifications = inviteeUuids.map((uuid) => ({
        user_id: uuid,
        type: "invitation",
        title: `${userProfile.name} invited you to join "${titleToUse}"`,
        body: "Spontaneous meetup invitation",
        reference_id: insertedPlanUuid,
        is_read: false,
        created_at: new Date().toISOString(),
      }));
      if (inviteNotifications.length > 0) {
        await fetch("/api/db/upsert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: "notifications", records: inviteNotifications }),
        });
      }

      if (userProfile.dbUuid) await syncUserStats(userProfile.dbUuid, "create_plan");
      await refreshPlans();

      // Local state hydration
      const localMembers = [
        {
          userId: userProfile.user_id,
          name: userProfile.name,
          avatar: userProfile.avatar,
          joinState: "host" as any,
          reminderState: "none" as const,
          joinedAt: hostJoinedAt,
          checkedIn: true,
        },
      ];
      inviteeUuids.forEach((uuid) => {
        const u = dbUsers.find((user) => user.id === uuid || user.user_id === uuid);
        if (u) {
          localMembers.push({
            userId: u.user_id,
            name: u.full_name,
            avatar: u.profile_photo,
            joinState: "delivered" as any,
            reminderState: "none" as const,
            joinedAt: new Date().toISOString(),
            checkedIn: false,
          });
        }
      });

      setPlans((prev) => [{ ...created, dbUuid: insertedPlanUuid, creatorId: userProfile.dbUuid, hostId: userProfile.dbUuid, members: localMembers, joinedUsers: localMembers }, ...prev]);
      setDbPlans((prev) => [dbPlanRow, ...prev]);
      if (dbPartRow) setDbPlanParticipants((prev) => [dbPartRow, ...prev]);

      const matchedCircleId = audienceType === "circle" ? selectedCircleIds[0] : null;
      if (matchedCircleId) {
        setCircles((prev) => prev.map((c) => c.id === matchedCircleId ? { ...c, lastSpontaneousActivity: `Spawned ${titleToUse} just now` } : c));
      }

      const newNotif: NotificationItem = {
        id: `n_${Date.now()}`,
        type: "general",
        title: `You spawned "${titleToUse}" at ${locationToUse}`,
        relativeTime: "1s",
      };
      setNotifications([newNotif, ...notifications]);

      // Reset
      setSelectedActivity(null);
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
      setCreateFlowStep("WHAT");
      setIsSubmitting(false);

      setActiveTab("circles");
      triggerToast("✨ Plan posted successfully!");
    } catch (err: any) {
      console.error("[CreatePlanFlow] Error:", err);
      setIsSubmitting(false);
      triggerToast(`Failed to post plan: ${err.message || "Unknown error"}`);
    }
  };

  return (
    <div id="create_tab_pane" className="space-y-5 animate-fade-in max-w-sm mx-auto">

      {/* STEP 1 — What */}
      {createFlowStep === "WHAT" && (
        <WhatStep
          selectedActivity={selectedActivity}
          setSelectedActivity={setSelectedActivity}
          setCreateFlowStep={setCreateFlowStep}
          setSelectedExperience={setSelectedExperience}
        />
      )}

      {/* STEP 2 — Location */}
      {createFlowStep === "LOCATION" && (
        <CustomLocationStep
          newPlanLocation={newPlanLocation}
          setNewPlanLocation={setNewPlanLocation}
          setCreateFlowStep={setCreateFlowStep}
        />
      )}

      {/* STEP 3 — Date & Time */}
      {createFlowStep === "DATETIME" && (
        <CustomDateTimeStep
          newPlanTime={newPlanTime}
          setNewPlanTime={setNewPlanTime}
          setNewPlanIsoDateTime={setNewPlanIsoDateTime}
          setCreateFlowStep={setCreateFlowStep}
        />
      )}

      {/* STEP 4 — Who */}
      {createFlowStep === "WHO" && (
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
          onBack={() => setCreateFlowStep("DATETIME")}
          onNext={() => setCreateFlowStep("COST")}
          hideWaitlist={true}
        />
      )}

      {/* STEP 5 — Cost */}
      {createFlowStep === "COST" && (
        <CostStep
          newPlanCost={newPlanCost}
          setNewPlanCost={setNewPlanCost}
          customPlanNotes={customPlanNotes}
          setCustomPlanNotes={setCustomPlanNotes}
          setCreateFlowStep={setCreateFlowStep}
          audienceType={audienceType}
          selectedCircleIds={selectedCircleIds}
          selectedFriendIds={selectedFriendIds}
          circles={circles}
        />
      )}

      {/* STEP 6 — Review */}
      {createFlowStep === "REVIEW" && selectedExperience && (
        <PlanPreviewStep
          newPlanTitle={newPlanTitle}
          setNewPlanTitle={setNewPlanTitle}
          newPlanLocation={newPlanLocation}
          newPlanTime={newPlanTime}
          newPlanCost={newPlanCost}
          customPlanNotes={customPlanNotes}
          audienceType={audienceType}
          selectedCircleIds={selectedCircleIds}
          selectedFriendIds={selectedFriendIds}
          circles={circles}
          dbUsers={dbUsers}
          selectedExperience={selectedExperience}
          newPlanUploadedImage={newPlanUploadedImage}
          setNewPlanUploadedImage={setNewPlanUploadedImage}
          setCreateFlowStep={setCreateFlowStep}
          handleHostPlanSubmit={handleHostPlanSubmit}
          isSubmitting={isSubmitting}
          onBack={() => setCreateFlowStep("COST")}
        />
      )}
    </div>
  );
};

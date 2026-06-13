/**
 * mappers.ts — Convert raw DB rows into the UI Plan/Circle/Transaction models.
 */

import { 
  Plan, Circle, Transaction, User, NotificationItem,
  DbCircle, DbCircleMember, DbPlan, DbPlanParticipant, DbTransaction 
} from "../core/types";
import { normalizeStatus } from "./participantStatus";

// ── avatar helper ───────────────────────────────────────────────────────────

export function initialsAvatar(name: string): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  const initials = parts.map(p => p[0]).slice(0, 2).join("").toUpperCase();
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <defs>
      <linearGradient id="g_${initials}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="hsl(${hue},40%,35%)"/>
        <stop offset="100%" stop-color="hsl(${(hue + 45) % 360},45%,22%)"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" fill="url(#g_${initials})"/>
    <text x="50%" y="54%" font-family="system-ui, -apple-system, BlinkMacSystemFont, sans-serif" font-weight="700"
      font-size="34" fill="#f4f4f5" text-anchor="middle" dominant-baseline="middle" letter-spacing="-0.03em">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getInitialsAvatar(name: string): string {
  return initialsAvatar(name);
}

// Helper to legacy mapped structural structures used by components (to run without major path rewrites)
export const mapPlansToLegacyPlans = (
  plansList: DbPlan[],
  participants: DbPlanParticipant[],
  usersList: User[],
  activeUserId: string = "",
  circlesList: DbCircle[] = []
): Plan[] => {
  const activeUserObj = usersList.find(u => u.user_id === activeUserId || (u as any).id === activeUserId);
  const activeUuid = activeUserObj ? (activeUserObj as any).id : activeUserId;
  const activeShortId = activeUserObj ? activeUserObj.user_id : activeUserId;

  const rawPlansCount = plansList.length;
  const rawParticipantsCount = participants.length;
  const uuids = plansList.map(p => p.id || p.plan_id || "");
  const uniqueUuids = [...new Set(uuids.filter(Boolean))];
  const duplicates = uuids.filter((item, index) => item && uuids.indexOf(item) !== index);

  console.log(`[mapPlansToLegacyPlans Audit] Raw plans count from database: ${rawPlansCount}`);
  console.log(`[mapPlansToLegacyPlans Audit] Raw plan_participants count: ${rawParticipantsCount}`);
  console.log(`[mapPlansToLegacyPlans Audit] Number of unique plan UUIDs: ${uniqueUuids.length}`);
  if (duplicates.length > 0) {
    console.error(`[mapPlansToLegacyPlans Audit] Duplicate plan UUIDs detected:`, duplicates);
  }

  return plansList.map(p => {
    // Resolve circle name from plans.circle_id -> circles.id -> circles.name
    const circleObj = circlesList.find(c => c.id === p.circle_id || c.circle_id === p.circle_id);
    const circleNameVal = circleObj ? circleObj.name : "Custom Plan";

    console.log(`[Plan Circle Resolution]`);
    console.log(`- plan id: ${p.id || p.plan_id}`);
    console.log(`- circle_id: ${p.circle_id}`);
    console.log(`- resolved circle name: ${circleNameVal}`);

    const hostIdVal = p.host_id || p.created_by;
    const isOwner = hostIdVal === activeUserId || hostIdVal === activeUuid || hostIdVal === activeShortId;
    const creator = usersList.find(u => (u as any).id === hostIdVal || u.user_id === hostIdVal) || {
      user_id: hostIdVal,
      username: "host",
      full_name: "Anonymous Host",
      phone_number: "",
      profile_photo: initialsAvatar("Anonymous Host"),
      bio: "",
      college_or_work: "",
      created_at: "",
      wallet_balance: 0,
      active_status: true
    };
    
    // Filter participants for this plan (all statuses, e.g. going, waitlist, new)
    const itemParticipants = participants.filter(pp => {
      return pp.plan_id === p.plan_id || pp.plan_id === (p as any).id;
    });
    
    // Deduplicate by user_id to ensure a user is only mapped once
    const uniqueParticipants: DbPlanParticipant[] = [];
    const seenUserIds = new Set<string>();
    for (const ip of itemParticipants) {
      if (!seenUserIds.has(ip.user_id)) {
        seenUserIds.add(ip.user_id);
        uniqueParticipants.push(ip);
      }
    }

    const members = uniqueParticipants.map(ip => {
      const u = usersList.find(user => (user as any).id === ip.user_id || user.user_id === ip.user_id);
      if (!u) {
        // Participant exists in DB but user not found in snapshot — skip silently
        console.warn(`[mappers] participant user_id ${ip.user_id} not found in users list`);
        return null;
      }

      return {
        userId: (u as any).id || u.user_id,       // UUID — used for all UI comparisons
        userUuid: (u as any).id, // UUID — stored for DB writes
        name: u.full_name,
        avatar: u.profile_photo,
        joinState: normalizeStatus(ip.status),
        reminderState: "none" as const,
        joinedAt: ip.joined_at,
        checkedIn: ip.payment_status === "paid"
      };
    }).filter(Boolean) as any[];

    // Robust field access with fallbacks for both old and new column naming conventions
    // Category field: uses activity_type from exact database schema
    const categoryVal = p.activity_type || (p as any).category || "custom";
    
    // Date/time: uses combined datetime from exact database schema
    const isIso = p.datetime && p.datetime.includes("T") && p.datetime.includes("-");
    let dateVal = "TODAY";
    let timeVal = "";

    if (isIso) {
      try {
        const planDate = new Date(p.datetime);
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);

        if (planDate.toDateString() === today.toDateString()) {
          dateVal = "TODAY";
        } else if (planDate.toDateString() === tomorrow.toDateString()) {
          dateVal = "TOMORROW";
        } else {
          dateVal = planDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase();
        }

        timeVal = planDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }).toUpperCase();
      } catch (err) {
        console.warn("[Mappers] Failed to parse ISO datetime:", p.datetime, err);
        dateVal = "TODAY";
        timeVal = "";
      }
    } else {
      dateVal = p.datetime ? String(p.datetime).split(" • ")[0] : "TODAY";
      timeVal = p.datetime ? String(p.datetime).split(" • ")[1] || String(p.datetime) : "";
    }
    
    // Max spots: join_limit = total going capacity INCLUDING host (canonical model).
    // Falls back to max_people or participant count for plans without waitlist.
    const maxSpotsVal = p.waitlist_enabled && p.join_limit ? p.join_limit : (p.max_people || (p as any).max_spots || (members.length > 0 ? members.length : 10));
    
    // Cost: uses split_amount from exact database schema
    const costVal = p.split_amount !== undefined ? Number(p.split_amount) : ((p as any).cost !== undefined ? Number((p as any).cost) : 0);
    
    // Cover image: new schema uses "cover_image", old code used "coverImage"
    const coverImageVal = p.cover_image || (p as any).coverImage || (p as any).coverimage || "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=600";
    
    const goingCount = members.filter(m => m.joinState === "going").length;
    const seatsLeftVal = p.seatsLeft !== undefined ? p.seatsLeft : ((p as any).seatsleft !== undefined ? (p as any).seatsleft : ((p as any).seats_left !== undefined ? (p as any).seats_left : (maxSpotsVal - goingCount)));

    console.log(`[mappers mapPlansToLegacyPlans] Plan: "${p.title}"`);
    console.log(`- Participant statuses:`, members.map(m => `${m.name}: ${m.joinState}`));
    console.log(`- Joined count calculation (host + going): ${goingCount}`);
    console.log(`- Displayed count / capacity: ${goingCount} / ${maxSpotsVal}`);

    const coordinatedSeatVal = p.coordinatedSeat || (p as any).coordinatedseat || (p as any).coordinated_seat;
    const userRatingVal = p.userRating !== undefined ? p.userRating : ((p as any).userrating !== undefined ? (p as any).userrating : (p as any).user_rating);
    const userReactionVal = p.userReaction || (p as any).userreaction || (p as any).user_reaction;
    const isHappenedVal = p.status === "completed" || (p.isHappened !== undefined ? p.isHappened : ((p as any).ishappened !== undefined ? (p as any).ishappened : ((p as any).is_happened !== undefined ? (p as any).is_happened : false)));

    return {
      // Strict Backend Contracts
      id: p.id || p.plan_id || "",
      dbUuid: p.id || p.plan_id || "",
      title: p.title,
      groupId: p.circle_id,
      hostId: hostIdVal,
      members: members,
      capacity: maxSpotsVal,
      date: dateVal,
      time: timeVal,
      location: p.location,
      paymentAmount: costVal,
      status: p.status as "active" | "completed" | "cancelled",
      datetime: p.datetime || p.created_at,
      createdAt: p.created_at,
      waitlistEnabled: p.waitlist_enabled,
      joinLimit: p.join_limit,
      response_cutoff_hours: p.response_cutoff_hours,
      response_deadline_at: p.response_deadline_at,

      // UI Legacy Properties
      category: (categoryVal === "football" || categoryVal === "badminton" ? "sports" : categoryVal === "dining" || categoryVal === "restaurants" || categoryVal === "brunch" ? "restaurants" : categoryVal) as any,
      cost: costVal,
      confirmedCount: goingCount,
      maxSpots: maxSpotsVal,
      coverImage: coverImageVal,
      creatorId: p.created_by,
      creatorName: creator.full_name,
      creatorAvatar: creator.profile_photo,
      joinedUsers: members,
      timeline: (dateVal.toLowerCase().includes("today") ? "today" : dateVal.toLowerCase().includes("tomorrow") ? "tomorrow" : "this_week") as any,
      description: p.description,
      theatre: p.theatre,
      seatsLeft: seatsLeftVal,
      notes: p.notes || (categoryVal === "football" ? "Bring your own jersey and water bottle." : undefined),
      coordinatedSeat: coordinatedSeatVal,
      userRating: userRatingVal,
      userReaction: userReactionVal,
      isHappened: isHappenedVal,
      circleId: p.circle_id,
      circleName: circleNameVal,

      // Sports Plan fields
      skillLevel: categoryVal === "football" ? "Competitive" : "Intermediate",
      matchFormat: categoryVal === "football" ? "7 vs 7" : "Friendly Match",
      sports_type: (p.sports_type || (categoryVal === "football" ? "Football" : categoryVal === "badminton" ? "Badminton" : undefined)) as "Football" | "Badminton" | "Basketball" | undefined,
      waitlistUsers: [],
      attendanceLogged: false,

      // Restaurant Plan fields
      cuisineType: categoryVal === "brunch" ? "French, Desserts, Waffles & Coffee" : "Indian, North Indian",
      tableAvailability: categoryVal === "brunch" ? "1 Table Left (4 Seats)" : "2 Tables Left (8 Seats)",
      estimatedCost: `₹${costVal} - ₹${costVal + 200} / Person`,
      interestedUsers: [],
      foodReaction: undefined
    };
  });
};

// Helper to map legacy Circles component expectations
export const mapCirclesToLegacyCircles = (
  circlesList: DbCircle[],
  members: DbCircleMember[],
  usersList: User[]
): Circle[] => {
  return circlesList.map(c => {
    const circleMemberRecords = members.filter(cm => cm.circle_id === c.circle_id || cm.circle_id === (c as any).id);
    const membersList = circleMemberRecords.map(cmr => {
      const u = usersList.find(usr => (usr as any).id === cmr.user_id || usr.user_id === cmr.user_id);
      if (!u) return null;
      return {
        userId: (u as any).id || u.user_id,
        name: u.full_name,
        phone: u.phone_number,
        avatar: u.profile_photo,
        role: cmr.role
      };
    }).filter(Boolean) as any[];

    return {
      id: c.circle_id,
      dbUuid: (c as any).id,
      name: c.name,
      membersCount: membersList.length,
      avatars: membersList.slice(0, 5).map(m => m.avatar),
      groupImage: c.cover_image,
      lastSpontaneousActivity: c.category === "football" ? "7-a-side booked: TODAY 8:00 PM" : "Late-night chats",
      description: c.description,
      type: c.category === "football" ? "Sports Match Crew" : "Spontaneous Hangout Circle",
      location: c.location_anchor,
      format: c.privacy === "private" ? "Spontaneous Private Crew" : "Public Community",
      playersOnField: membersList.length,
      timeWindow: "Flexible hours",
      membersList: membersList
    };
  });
};

// Helper to legacy mapped transactions expected by UI lists
export const mapTransactionsToLegacy = (
  txs: DbTransaction[], 
  usersList: User[], 
  activeUserId: string = "",
  plansList: DbPlan[] = []
): Transaction[] => {
  // Resolve active user's UUID so we can correctly determine credit/debit direction
  const activeUserObj = usersList.find(u => u.user_id === activeUserId || u.id === activeUserId);
  const activeUuid = activeUserObj?.id || "";

  return txs.map(t => {
    // transactions.sender_id and receiver_id store users.id (UUID).
    // Fall back to user_id match for legacy/demo data that may have short IDs.
    const rxUser = usersList.find(u => u.id === t.receiver_id || u.user_id === t.receiver_id);
    const sxUser = usersList.find(u => u.id === t.sender_id  || u.user_id === t.sender_id);
    const rx = rxUser?.full_name || "Self";
    const sx = sxUser?.full_name || "Self";
    
    let title = "Deposit";
    if (t.transaction_type === "split_payment" || t.transaction_type === "plan_payment") {
      // Determine direction: sender = this user → debit; else credit
      const isSender = t.sender_id === activeUuid || t.sender_id === activeUserId;
      title = isSender ? `Paid ${rx}` : `Received from ${sx}`;
    } else if (t.transaction_type === "deposit") {
      title = "Top-up Wallet";
    }

    // Credit/debit: if sender is the active user → debit; otherwise → credit
    const isSenderMatch = t.sender_id === activeUuid || t.sender_id === activeUserId;

    const planObj = plansList.find(p => p.id === t.plan_id || p.plan_id === t.plan_id);
    const planTitle = planObj ? planObj.title : null;

    return {
      id: t.transaction_id,
      title: title,
      amount: t.amount,
      type: (isSenderMatch ? "debit" : "credit") as "debit" | "credit",
      timestamp: t.timestamp,
      settled: (t.status as any) === "success" || (t.status as any) === "completed" || (t.status as any) === true,
      status: t.status,
      transactionType: t.transaction_type,
      planTitle: planTitle
    };
  });
};


export const NotificationMeta: Record<string, { label: string; icon: string }> = {
  PLAN_INVITATION: { label: "Invitation", icon: "✉️" },
  WAITLIST_PROMOTED: { label: "Promoted", icon: "⚡" },
  PLAN_CANCELLED: { label: "Cancelled", icon: "❌" },
  PLAN_UPDATED: { label: "Updated", icon: "✏️" },
  HOST_TRANSFERRED: { label: "Host Transfer", icon: "👑" },
  PARTICIPANT_JOINED: { label: "Joined", icon: "✅" },
  PARTICIPANT_SKIPPED: { label: "Skipped", icon: "🏃" },
  // Compatibility fallbacks:
  invitation: { label: "Invitation", icon: "✉️" },
  urgency: { label: "Urgent", icon: "⚠️" },
  payment: { label: "Payment", icon: "💳" },
  general: { label: "General", icon: "🔔" }
};

function formatRelativeTime(createdTime?: string): string {
  if (!createdTime) return "just now";
  try {
    const diffMs = new Date().getTime() - new Date(createdTime).getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(createdTime).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "just now";
  }
}

export const mapNotificationsToLegacy = (
  notificationsList: any[],
  plansList: DbPlan[],
  usersList: User[],
  activeUserId: string = ""
): NotificationItem[] => {
  const activeUserObj = usersList.find(u => u.user_id === activeUserId || (u as any).id === activeUserId);
  const activeUuid = activeUserObj ? (activeUserObj as any).id : activeUserId;

  return (notificationsList || [])
    .filter(n => n.user_id === activeUuid)
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .map(n => {
      const plan = plansList.find(p => (p as any).id === n.reference_id || p.plan_id === n.reference_id);
      
      return {
        id: n.id,
        type: n.type as any,
        title: n.title,
        body: n.body || "",
        relativeTime: formatRelativeTime(n.created_at),
        actionText: n.type === "PLAN_INVITATION" || n.type === "invitation" ? "Accept & Join" : undefined,
        planId: plan ? plan.plan_id : undefined,
        settled: n.is_read,
        cost: plan ? Number(plan.split_amount) : undefined,
        creatorId: plan ? plan.created_by : undefined,
        createdAt: n.created_at
      };
    });
};

export function getDeadlineText(deadlineAt?: string): string {
  if (!deadlineAt) return "";
  const now = new Date().getTime();
  const deadline = new Date(deadlineAt).getTime();
  const diff = deadline - now;
  if (diff <= 0) {
    return "Responses Closed";
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours >= 24) {
    const date = new Date(deadlineAt);
    return `Responses Close: ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  }
  
  if (hours > 0) {
    return `Closes in ${hours}h ${minutes}m`;
  }
  return `Closes in ${minutes}m`;
}

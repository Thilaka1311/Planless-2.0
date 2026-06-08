import React from "react";
import { Plan, UserProfile } from "../../../core/types";
import { getInitialsAvatar, getDeadlineText } from "../../../lib/mappers";
import { normalizeStatus } from "../../../lib/participantStatus";

export function usePlanVisibility(plan: Plan, userProfile: UserProfile) {
  const myMemberEntry = plan.members.find(m => 
    m.userId === userProfile.user_id || 
    (userProfile.dbUuid && m.userUuid === userProfile.dbUuid)
  );

  const isJoined = myMemberEntry ? (myMemberEntry.joinState === "going") : false;
  const isWaitlisted = myMemberEntry ? (myMemberEntry.joinState === "waitlist") : false;

  const isDeadlinePassed = React.useMemo(() => {
    if (!plan.response_deadline_at) return false;
    return new Date().getTime() > new Date(plan.response_deadline_at).getTime();
  }, [plan.response_deadline_at]);

  const getFormattedDateAndTime = () => {
    const rawDate = (plan.date || "TODAY").trim().toUpperCase();
    const rawTime = (plan.time || "8:30 PM").trim().toUpperCase();
    const cleanTime = rawTime.replace(/⏰/g, "").replace(/TODAY\s*•\s*/g, "").trim();

    if (rawDate === "TODAY") return `TUE, 26 MAY • ${cleanTime}`;
    if (rawDate === "TOMORROW") return `WED, 27 MAY • ${cleanTime}`;
    if (rawDate === "FRI" || rawDate === "FRIDAY") return `FRI, 29 MAY • ${cleanTime}`;
    if (rawDate === "SAT" || rawDate === "SATURDAY") return `SAT, 30 MAY • ${cleanTime}`;
    if (rawDate === "SUN" || rawDate === "SUNDAY") return `SUN, 31 MAY • ${cleanTime}`;
    if (rawDate === "THU" || rawDate === "THURSDAY") return `THU, 28 MAY • ${cleanTime}`;
    if (rawDate.includes(",")) return `${rawDate} • ${cleanTime}`;

    return `${rawDate} • ${cleanTime}`;
  };

  const getParticipantStatusList = () => {
    const hostName = plan.creatorName || "Host";
    const hostAvatar = plan.creatorAvatar || getInitialsAvatar(hostName);

    const going: { name: string; avatar: string; status: string; isHost: boolean }[] = [];
    const waitlist: { name: string; avatar: string; status: string }[] = [];
    const delivered: { name: string; avatar: string; status: string }[] = [];
    const seen: { name: string; avatar: string; status: string }[] = [];
    const skipped: { name: string; avatar: string; status: string }[] = [];

    // Always put host first in going
    going.push({ name: hostName, avatar: hostAvatar, status: "Going", isHost: true });

    const hostUuid = plan.creatorId || plan.hostId;
    for (const m of plan.members) {
      if (m.userUuid === hostUuid || m.userId === hostUuid) continue;

      const entry = {
        name: m.name,
        avatar: m.avatar || getInitialsAvatar(m.name),
      };

      const normalizedState = normalizeStatus(m.joinState);

      if (normalizedState === "going") {
        going.push({ ...entry, status: "Going", isHost: false });
      } else if (normalizedState === "waitlist") {
        waitlist.push({ ...entry, status: "Waitlist" });
      } else if (normalizedState === "delivered") {
        delivered.push({ ...entry, status: "Delivered" });
      } else if (normalizedState === "seen") {
        seen.push({ ...entry, status: "Seen" });
      } else if (normalizedState === "skipped") {
        skipped.push({ ...entry, status: "Skipped" });
      } else {
        delivered.push({ ...entry, status: "Delivered" });
      }
    }

    return { going, waitlist, delivered, seen, skipped };
  };

  const displayActivityName = React.useMemo(() => {
    if (plan.category === "sports") {
      if (plan.sports_type === "Football") {
        return "Football Tonight";
      } else if (plan.sports_type === "Badminton") {
        return "Badminton Session";
      }
      return "Sports Match";
    } else if (plan.category === "movies") {
      return "Luxe IMAX";
    } else if (plan.category === "restaurants") {
      return "Waffle Time";
    } else {
      return plan.title.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
    }
  }, [plan.category, plan.sports_type, plan.title]);

  const categoryStr = plan.category as string;
  let categoryTag = "COFFEE NIGHT";
  if (categoryStr === "sports" || plan.id === "P001") {
    categoryTag = "MATCHDAY";
  } else if (categoryStr === "movies") {
    categoryTag = "BLOCKBUSTER";
  } else if (categoryStr === "restaurants") {
    categoryTag = "CAFE VENTURES";
  }

  let glowStyle = "from-emerald-500/15 to-emerald-600/5 text-emerald-300 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.25)]";
  if (categoryStr === "restaurants") {
    glowStyle = "from-rose-500/15 to-pink-500/5 text-rose-300 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.25)]";
  } else if (categoryStr === "movies") {
    glowStyle = "from-sky-500/15 to-blue-600/5 text-sky-300 border-sky-500/30 shadow-[0_0_12px_rgba(14,165,233,0.25)]";
  } else if (categoryStr === "sports") {
    glowStyle = "from-emerald-500/15 to-emerald-600/5 text-emerald-300 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.25)]";
  }

  const coverToUse = plan.category === "sports"
    ? "/navkis_matchday.png"
    : plan.coverImage;

  const maxSpots = plan.maxSpots || (plan.category === "movies" ? 10 : plan.category === "sports" ? 14 : 8);
  const goingMembers = plan.members.filter(m => m.joinState === "going");
  const currentCount = goingMembers.length;
  const isFull = currentCount >= maxSpots;

  let barGradient = "from-[#ff8b66] to-[#fc5c42]";
  let categoryColorDot = "bg-[#ff8b66]";

  if (categoryStr === "restaurants") {
    barGradient = "from-rose-400 to-pink-500";
    categoryColorDot = "bg-rose-400";
  } else if (categoryStr === "movies") {
    barGradient = "from-sky-400 to-blue-500";
    categoryColorDot = "bg-sky-450";
  }

  let groupName = plan.circleName || "Custom Plan";
  let groupColor = "text-[#ff8b66]";

  if (categoryStr === "sports") {
    groupColor = "text-emerald-400";
  } else if (categoryStr === "movies") {
    groupColor = "text-sky-400";
  } else if (categoryStr === "restaurants") {
    groupColor = "text-rose-400";
  }

  return {
    isJoined,
    isWaitlisted,
    isDeadlinePassed,
    formattedDateAndTime: getFormattedDateAndTime(),
    getParticipantStatusList,
    displayActivityName,
    categoryTag,
    glowStyle,
    coverToUse,
    maxSpots,
    currentCount,
    isFull,
    barGradient,
    categoryColorDot,
    groupName,
    groupColor,
  };
}

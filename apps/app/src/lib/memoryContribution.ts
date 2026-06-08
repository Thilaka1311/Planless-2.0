import {
  DbMemory,
  DbMemoryAttendee,
  DbMemoryMovieVerdict,
  DbMemoryRestaurantVote,
  DbMemoryMatchResult,
  DbMemoryMvpVote,
  DbMemoryBadmintonResult
} from "../core/types";

export type MemoryContributionStatus =
  | "not_attendee"
  | "pending_verdict"   // Movies
  | "pending_vote"      // Dining
  | "pending_result"    // Sports (Football/Badminton) score recorded check
  | "pending_mvp"       // Sports (Football/Badminton) MVP vote check
  | "recorded"
  | "locked"
  | "no_memory";

export interface MemoryContributionInfo {
  status: MemoryContributionStatus;
  badgeLabel: string;
  badgeVariant: "pending" | "recorded" | "neutral";
  entryPrompt: string | null;
  entrySubtext: string | null;
}

export function getMemoryContribution(
  memory: DbMemory | null | undefined,
  userId: string,
  isHost: boolean,
  attendees: DbMemoryAttendee[],
  movieVerdicts: DbMemoryMovieVerdict[],
  restaurantVotes: DbMemoryRestaurantVote[],
  matchResults: DbMemoryMatchResult[],
  mvpVotes: DbMemoryMvpVote[],
  badmintonResults: DbMemoryBadmintonResult[]
): MemoryContributionInfo {
  if (!memory) {
    return {
      status: "no_memory",
      badgeLabel: "Memory Pending",
      badgeVariant: "pending",
      entryPrompt: null,
      entrySubtext: null,
    };
  }

  const memType = (memory.memory_type || "").toLowerCase();
  const isAttendee = attendees.some(
    a => a.memory_id === memory.id && a.user_id === userId
  );
  
  const now = new Date().getTime();
  const editWindowOpen =
    memory.editable_until
      ? now < new Date(memory.editable_until).getTime()
      : false;

  // ── MOVIE ──────────────────────────────────────────────────────────
  if (memType === "movie") {
    if (!isAttendee) {
      return {
        status: "not_attendee",
        badgeLabel: "Memory Recorded",
        badgeVariant: "neutral",
        entryPrompt: null,
        entrySubtext: null,
      };
    }

    const myVerdict = movieVerdicts.find(
      v => v.memory_id === memory.id && v.user_id === userId
    );

    if (myVerdict) {
      return {
        status: "recorded",
        badgeLabel: "Memory Recorded",
        badgeVariant: "recorded",
        entryPrompt: null,
        entrySubtext: null,
      };
    }

    if (!editWindowOpen) {
      return {
        status: "locked",
        badgeLabel: "Memory Closed",
        badgeVariant: "neutral",
        entryPrompt: null,
        entrySubtext: null,
      };
    }

    return {
      status: "pending_verdict",
      badgeLabel: "How was it?",
      badgeVariant: "pending",
      entryPrompt: "How was the movie?",
      entrySubtext: "Loved it, Good, or Not for me?",
    };
  }

  // ── DINING ─────────────────────────────────────────────────────────
  if (memType === "dining") {
    if (!isAttendee) {
      return {
        status: "not_attendee",
        badgeLabel: "Memory Recorded",
        badgeVariant: "neutral",
        entryPrompt: null,
        entrySubtext: null,
      };
    }

    const myVote = restaurantVotes.find(
      v => v.memory_id === memory.id && v.user_id === userId
    );

    if (myVote) {
      return {
        status: "recorded",
        badgeLabel: "Memory Recorded",
        badgeVariant: "recorded",
        entryPrompt: null,
        entrySubtext: null,
      };
    }

    if (!editWindowOpen) {
      return {
        status: "locked",
        badgeLabel: "Memory Closed",
        badgeVariant: "neutral",
        entryPrompt: null,
        entrySubtext: null,
      };
    }

    return {
      status: "pending_vote",
      badgeLabel: "Would you return?",
      badgeVariant: "pending",
      entryPrompt: "Would you return?",
      entrySubtext: "Rate your dining experience.",
    };
  }

  // ── FOOTBALL ──────────────────────────────────────────────────────
  if (memType === "football") {
    const matchResult = matchResults.find(r => r.memory_id === memory.id);
    const hasResult = !!matchResult;

    if (!hasResult) {
      if (!editWindowOpen) {
        return {
          status: "locked",
          badgeLabel: "Memory Closed",
          badgeVariant: "neutral",
          entryPrompt: null,
          entrySubtext: null,
        };
      }
      return {
        status: "pending_result",
        badgeLabel: "Record Result",
        badgeVariant: "pending",
        entryPrompt: "Record Result",
        entrySubtext: isHost ? "Record the final match score." : "Waiting for host to record score.",
      };
    }

    if (!isAttendee) {
      return {
        status: "not_attendee",
        badgeLabel: "Result Recorded",
        badgeVariant: "neutral",
        entryPrompt: null,
        entrySubtext: null,
      };
    }

    const myMvpVote = mvpVotes.find(
      v => v.memory_id === memory.id && v.voter_user_id === userId
    );

    if (myMvpVote) {
      return {
        status: "recorded",
        badgeLabel: "Memory Recorded",
        badgeVariant: "recorded",
        entryPrompt: null,
        entrySubtext: null,
      };
    }

    if (!editWindowOpen) {
      return {
        status: "locked",
        badgeLabel: "Memory Closed",
        badgeVariant: "neutral",
        entryPrompt: null,
        entrySubtext: null,
      };
    }

    return {
      status: "pending_mvp",
      badgeLabel: "Vote MVP",
      badgeVariant: "pending",
      entryPrompt: "Vote MVP",
      entrySubtext: "Who was the best player today?",
    };
  }

  // ── BADMINTON ─────────────────────────────────────────────────────
  if (memType === "badminton") {
    if (!isAttendee) {
      return {
        status: "not_attendee",
        badgeLabel: "Result Recorded",
        badgeVariant: "neutral",
        entryPrompt: null,
        entrySubtext: null,
      };
    }

    const myResult = badmintonResults.find(r => r.memory_id === memory.id && r.user_id === userId);
    const hasResult = !!myResult;

    if (!hasResult) {
      if (!editWindowOpen) {
        return {
          status: "locked",
          badgeLabel: "Memory Closed",
          badgeVariant: "neutral",
          entryPrompt: null,
          entrySubtext: null,
        };
      }
      return {
        status: "pending_result",
        badgeLabel: "Record Result",
        badgeVariant: "pending",
        entryPrompt: "How did your session go?",
        entrySubtext: "Record wins and losses.",
      };
    }

    const myMvpVote = mvpVotes.find(
      v => v.memory_id === memory.id && v.voter_user_id === userId
    );

    if (myMvpVote) {
      return {
        status: "recorded",
        badgeLabel: "Memory Recorded",
        badgeVariant: "recorded",
        entryPrompt: null,
        entrySubtext: null,
      };
    }

    if (!editWindowOpen) {
      return {
        status: "locked",
        badgeLabel: "Memory Closed",
        badgeVariant: "neutral",
        entryPrompt: null,
        entrySubtext: null,
      };
    }

    return {
      status: "pending_mvp",
      badgeLabel: "Vote MVP",
      badgeVariant: "pending",
      entryPrompt: "Vote MVP",
      entrySubtext: "Who was the best player today?",
    };
  }

  // ── FALLBACK ───────────────────────────────────────────────────────
  return {
    status: "recorded",
    badgeLabel: "Memory Recorded",
    badgeVariant: "recorded",
    entryPrompt: null,
    entrySubtext: null,
  };
}

export function hasOutstandingMemoryAction(
  memory: DbMemory,
  userId: string,
  isHost: boolean,
  attendees: DbMemoryAttendee[],
  movieVerdicts: DbMemoryMovieVerdict[],
  restaurantVotes: DbMemoryRestaurantVote[],
  matchResults: DbMemoryMatchResult[],
  mvpVotes: DbMemoryMvpVote[],
  badmintonResults: DbMemoryBadmintonResult[]
): boolean {
  const isAttendee = attendees.some(
    a => a.memory_id === memory.id && a.user_id === userId
  );
  
  const now = new Date().getTime();
  const editWindowOpen =
    memory.editable_until
      ? now < new Date(memory.editable_until).getTime()
      : false;

  if (!editWindowOpen) return false;

  const memType = (memory.memory_type || "").toLowerCase();

  // ── MOVIE ──
  if (memType === "movie") {
    if (!isAttendee) return false;
    const myVerdict = movieVerdicts.some(
      v => v.memory_id === memory.id && v.user_id === userId
    );
    return !myVerdict;
  }

  // ── DINING ──
  if (memType === "dining") {
    if (!isAttendee) return false;
    const myVote = restaurantVotes.some(
      v => v.memory_id === memory.id && v.user_id === userId
    );
    return !myVote;
  }

  // ── FOOTBALL ──
  if (memType === "football") {
    const hasResult = matchResults.some(r => r.memory_id === memory.id);
    if (!hasResult) {
      // Outstanding for host only
      return isHost;
    }
    // Result exists, outstanding for attendee if they haven't voted MVP yet
    if (!isAttendee) return false;
    const myMvpVote = mvpVotes.some(
      v => v.memory_id === memory.id && v.voter_user_id === userId
    );
    return !myMvpVote;
  }

  // ── BADMINTON ──
  if (memType === "badminton") {
    if (!isAttendee) return false;
    const myResult = badmintonResults.some(
      r => r.memory_id === memory.id && r.user_id === userId
    );
    if (!myResult) {
      return true; // outstanding wins/losses
    }
    // result exists, check MVP
    const myMvpVote = mvpVotes.some(
      v => v.memory_id === memory.id && v.voter_user_id === userId
    );
    return !myMvpVote;
  }

  return false;
}

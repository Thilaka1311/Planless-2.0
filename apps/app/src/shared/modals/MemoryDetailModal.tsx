import React, { useState } from "react";
import {
  X, Lock, Film, Utensils, CheckCircle, Trophy, Target, Sparkles, Award
} from "lucide-react";
import {
  Plan,
  DbMemory,
  DbMemoryAttendee,
  DbMemoryMovieVerdict,
  DbMemoryRestaurantVote,
  DbMemoryMatchResult,
  DbMemoryMvpVote,
  DbMemoryBadmintonResult,
  User
} from "../../core/types";
import { usePlansStore } from "../../features/plans/state/PlansContext";

interface MemoryDetailModalProps {
  plan: Plan;
  memory: DbMemory;
  onClose: () => void;
  activeUserId: string;
  dbUsers: User[];
  memoryAttendees: DbMemoryAttendee[];
  memoryMovieVerdicts: DbMemoryMovieVerdict[];
  memoryRestaurantVotes: DbMemoryRestaurantVote[];
  memoryMatchResults: DbMemoryMatchResult[];
  memoryMvpVotes: DbMemoryMvpVote[];
  dbMemoryBadmintonResults: DbMemoryBadmintonResult[];
}

function CategoryIcon({ type }: { type: string }) {
  if (type === "movie") return <Film className="w-5 h-5 text-[#FF6B2C]" />;
  if (type === "dining") return <Utensils className="w-5 h-5 text-[#FF6B2C]" />;
  if (type === "football") return <Trophy className="w-5 h-5 text-[#FF6B2C]" />;
  if (type === "badminton") return <Target className="w-5 h-5 text-[#FF6B2C]" />;
  return <Sparkles className="w-5 h-5 text-[#FF6B2C]" />;
}

function getHeaderEmoji(type: string) {
  if (type === "movie") return "🎬 Movie Night";
  if (type === "dining") return "🍽 Dinner";
  if (type === "football") return "⚽ Match Result";
  if (type === "badminton") return "🏸 Match Result";
  return "⭐ Memory Details";
}

export default function MemoryDetailModal({
  plan,
  memory,
  onClose,
  activeUserId,
  dbUsers,
  memoryAttendees,
  memoryMovieVerdicts,
  memoryRestaurantVotes,
  memoryMatchResults,
  memoryMvpVotes,
  dbMemoryBadmintonResults,
}: MemoryDetailModalProps) {
  const { submitMovieVerdict, submitRestaurantVote, submitMatchResult, submitMvpVote, submitBadmintonResult } = usePlansStore();

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Match score state
  const matchResult = memoryMatchResults.find(r => r.memory_id === memory.id);
  const hasResult = !!matchResult;
  const [scoreA, setScoreA] = useState<string>(matchResult ? String(matchResult.team_a_score) : "");
  const [scoreB, setScoreB] = useState<string>(matchResult ? String(matchResult.team_b_score) : "");

  const badmintonResultsList = dbMemoryBadmintonResults.filter(r => r.memory_id === memory.id);
  const myBadmintonResult = badmintonResultsList.find(r => r.user_id === activeUserId);
  const [winsInput, setWinsInput] = useState<number>(myBadmintonResult ? myBadmintonResult.wins : 0);
  const [lossesInput, setLossesInput] = useState<number>(myBadmintonResult ? myBadmintonResult.losses : 0);

  React.useEffect(() => {
    if (myBadmintonResult) {
      setWinsInput(myBadmintonResult.wins);
      setLossesInput(myBadmintonResult.losses);
    }
  }, [myBadmintonResult]);

  const isHost = plan.hostId === "u_self" || plan.hostId === activeUserId;
  const isEditWindowOpen = new Date().getTime() < new Date(memory.editable_until).getTime();

  // Attendees list
  const attendeesList = memoryAttendees.filter((a) => a.memory_id === memory.id);
  const attendeeUsers = attendeesList.map((att) => {
    const u = dbUsers.find((u) => (u as any).id === att.user_id || u.user_id === att.user_id);
    return {
      userId: att.user_id,
      fullName: u?.full_name || "Member",
      avatar:
        u?.profile_photo ||
        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u?.full_name || "UA")}&backgroundColor=ff8b66`,
    };
  });

  const isAttendee = attendeesList.some((a) => a.user_id === activeUserId);

  // Category specific contributions
  const movieVerdictsList = memoryMovieVerdicts.filter(v => v.memory_id === memory.id);
  const myVerdict = movieVerdictsList.find(v => v.user_id === activeUserId);

  const restaurantVotesList = memoryRestaurantVotes.filter(v => v.memory_id === memory.id);
  const myVote = restaurantVotesList.find(v => v.user_id === activeUserId);

  const mvpVotesList = memoryMvpVotes.filter(v => v.memory_id === memory.id);
  const myMvpVote = mvpVotesList.find(v => v.voter_user_id === activeUserId);

  // Compute status badge
  let statusBadgeLabel = "contribution required";
  let statusBadgeColor = "text-amber-400 bg-amber-950/20 border-amber-900/30";

  if (!isEditWindowOpen) {
    statusBadgeLabel = "Memory Closed";
    statusBadgeColor = "text-zinc-500 bg-zinc-950 border-zinc-900";
  } else {
    if (memory.memory_type === "movie") {
      if (!isAttendee || myVerdict) {
        statusBadgeLabel = "Memory Recorded";
        statusBadgeColor = "text-emerald-400 bg-emerald-950/20 border-emerald-900/30";
      } else {
        statusBadgeLabel = "How was it?";
        statusBadgeColor = "text-amber-400 bg-amber-950/20 border-amber-900/30";
      }
    } else if (memory.memory_type === "dining") {
      if (!isAttendee || myVote) {
        statusBadgeLabel = "Memory Recorded";
        statusBadgeColor = "text-emerald-400 bg-emerald-950/20 border-emerald-900/30";
      } else {
        statusBadgeLabel = "Would you return?";
        statusBadgeColor = "text-amber-400 bg-amber-950/20 border-amber-900/30";
      }
    } else if (memory.memory_type === "football") {
      if (!matchResult) {
        statusBadgeLabel = "Record Result";
        statusBadgeColor = "text-amber-400 bg-amber-950/20 border-amber-900/30";
      } else if (isAttendee && !myMvpVote) {
        statusBadgeLabel = "Vote MVP";
        statusBadgeColor = "text-amber-400 bg-amber-950/20 border-amber-900/30";
      } else {
        statusBadgeLabel = "Memory Recorded";
        statusBadgeColor = "text-emerald-400 bg-emerald-950/20 border-emerald-900/30";
      }
    } else if (memory.memory_type === "badminton") {
      if (!myBadmintonResult) {
        statusBadgeLabel = "Record Result";
        statusBadgeColor = "text-amber-400 bg-amber-950/20 border-amber-900/30";
      } else if (isAttendee && !myMvpVote) {
        statusBadgeLabel = "Vote MVP";
        statusBadgeColor = "text-amber-400 bg-amber-950/20 border-amber-900/30";
      } else {
        statusBadgeLabel = "Memory Recorded";
        statusBadgeColor = "text-emerald-400 bg-emerald-950/20 border-emerald-900/30";
      }
    }
  }

  // MovieVerdict Submit
  const handleMovieVerdictSubmit = async (verdict: "loved_it" | "good" | "not_for_me") => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await submitMovieVerdict(memory.id, verdict, activeUserId);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit verdict");
    } finally {
      setSubmitting(false);
    }
  };

  // Dining Vote Submit
  const handleRestaurantVoteSubmit = async (vote: "yes" | "maybe" | "no") => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await submitRestaurantVote(memory.id, vote, activeUserId);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit vote");
    } finally {
      setSubmitting(false);
    }
  };

  // Match Result Submit
  const handleMatchResultSubmit = async () => {
    if (scoreA === "" || scoreB === "") return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await submitMatchResult(memory.id, parseInt(scoreA), parseInt(scoreB), activeUserId);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save match result");
    } finally {
      setSubmitting(false);
    }
  };

  // Badminton Result Submit
  const handleBadmintonResultSubmit = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await submitBadmintonResult(memory.id, winsInput, lossesInput, activeUserId);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit badminton result");
    } finally {
      setSubmitting(false);
    }
  };

  // MVP Vote Submit
  const handleMvpVoteSubmit = async (mvpUserUuid: string) => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await submitMvpVote(memory.id, activeUserId, mvpUserUuid);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit MVP vote");
    } finally {
      setSubmitting(false);
    }
  };

  // Aggregated Verdicts
  const lovedCount = movieVerdictsList.filter(v => v.verdict === "loved_it").length;
  const goodCount = movieVerdictsList.filter(v => v.verdict === "good").length;
  const notForMeCount = movieVerdictsList.filter(v => v.verdict === "not_for_me").length;

  // Aggregated Restaurant Votes
  const yesCount = restaurantVotesList.filter(v => v.vote === "yes").length;
  const maybeCount = restaurantVotesList.filter(v => v.vote === "maybe").length;
  const noCount = restaurantVotesList.filter(v => v.vote === "no").length;

  // MVP vote stats
  const mvpCounts: Record<string, number> = {};
  mvpVotesList.forEach(v => {
    mvpCounts[v.mvp_user_id] = (mvpCounts[v.mvp_user_id] || 0) + 1;
  });
  const sortedMvpLeaders = Object.entries(mvpCounts)
    .map(([userId, votes]) => {
      const u = attendeeUsers.find(au => au.userId === userId);
      return {
        userId,
        fullName: u?.fullName || "Member",
        avatar: u?.avatar || "",
        votes
      };
    })
    .sort((a, b) => b.votes - a.votes);

  return (
    <div className="fixed inset-0 bg-[#050505]/90 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans select-none animate-fadeIn">
      <div className="bg-[#0D0D10] border border-zinc-900 rounded-[2rem] w-full max-w-md overflow-hidden relative shadow-[0_24px_50px_-12px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="p-6 border-b border-zinc-900/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-center shrink-0 shadow-inner">
              <CategoryIcon type={memory.memory_type} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono text-[#FF6B2C] uppercase tracking-wider block font-bold">
                {getHeaderEmoji(memory.memory_type)}
              </span>
              <h3 className="text-base font-black text-white leading-tight truncate pr-4 mt-0.5">{plan.title}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-left">

          {/* Status Badge */}
          <div className="flex items-center justify-between bg-zinc-900/20 border border-zinc-900/40 rounded-2xl p-4">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest font-black">Status</span>
            <span className={`text-[8px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusBadgeColor}`}>
              {statusBadgeLabel}
            </span>
          </div>

          {/* 🎬 MOVIE VERDICTS */}
          {memory.memory_type === "movie" && (
            <div className="space-y-6">
              {isAttendee && (
                <div className="space-y-3">
                  {myVerdict ? (
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-5 flex flex-col items-center justify-center gap-1.5">
                      <CheckCircle className="w-6 h-6 text-emerald-400" />
                      <span className="text-emerald-450 text-xs font-sans font-bold block mt-1">✓ Verdict Submitted</span>
                      <span className="text-zinc-450 text-[10px] font-mono uppercase tracking-wider">
                        Your verdict:{" "}
                        <strong className="text-white font-black">
                          {myVerdict.verdict === "loved_it" ? "Loved It 🔥" : myVerdict.verdict === "good" ? "Good 👍" : "Not For Me 👎"}
                        </strong>
                      </span>
                    </div>
                  ) : isEditWindowOpen ? (
                    <div className="space-y-4 bg-zinc-950/40 border border-zinc-900/60 rounded-2xl p-5 shadow-inner">
                      <div className="text-center">
                        <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wide">How was the movie?</h4>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleMovieVerdictSubmit("loved_it")}
                          disabled={submitting}
                          className="w-full h-11 rounded-xl bg-gradient-to-r from-red-500/10 to-amber-500/10 hover:from-red-500/20 hover:to-amber-500/20 border border-amber-500/20 text-zinc-100 font-sans font-bold text-xs uppercase tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          🔥 Loved It
                        </button>
                        <button
                          onClick={() => handleMovieVerdictSubmit("good")}
                          disabled={submitting}
                          className="w-full h-11 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-100 font-sans font-bold text-xs uppercase tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          👍 Good
                        </button>
                        <button
                          onClick={() => handleMovieVerdictSubmit("not_for_me")}
                          disabled={submitting}
                          className="w-full h-11 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-900/60 text-zinc-400 font-sans font-bold text-xs uppercase tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          👎 Not For Me
                        </button>
                      </div>
                      {errorMsg && <p className="text-[10px] font-mono text-rose-450 text-center">{errorMsg}</p>}
                    </div>
                  ) : (
                    <div className="bg-[#050505]/40 border border-zinc-900/80 rounded-2xl p-5 flex flex-col items-center justify-center gap-1.5 text-zinc-550">
                      <Lock className="w-4 h-4 text-zinc-650" />
                      <span className="text-[9px] font-mono uppercase font-black tracking-wider block">Memory Closed</span>
                    </div>
                  )}
                </div>
              )}

              {/* Aggregated Results */}
              <div className="border-t border-zinc-900/40 pt-5 space-y-3">
                <h4 className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest font-black px-1">Aggregated Verdicts</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-zinc-900/20 border border-zinc-900/40 rounded-xl p-3 text-center">
                    <span className="text-xl block">🔥</span>
                    <span className="text-[9px] font-mono text-zinc-500 block uppercase mt-1">Loved It</span>
                    <span className="text-sm font-black text-white font-mono mt-0.5 block">{lovedCount}</span>
                  </div>
                  <div className="bg-zinc-900/20 border border-zinc-900/40 rounded-xl p-3 text-center">
                    <span className="text-xl block">👍</span>
                    <span className="text-[9px] font-mono text-zinc-500 block uppercase mt-1">Good</span>
                    <span className="text-sm font-black text-white font-mono mt-0.5 block">{goodCount}</span>
                  </div>
                  <div className="bg-zinc-900/20 border border-zinc-900/40 rounded-xl p-3 text-center">
                    <span className="text-xl block">👎</span>
                    <span className="text-[9px] font-mono text-zinc-500 block uppercase mt-1">Not For Me</span>
                    <span className="text-sm font-black text-white font-mono mt-0.5 block">{notForMeCount}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 🍽 DINING RETURNS */}
          {memory.memory_type === "dining" && (
            <div className="space-y-6">
              {isAttendee && (
                <div className="space-y-3">
                  {myVote ? (
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-5 flex flex-col items-center justify-center gap-1.5">
                      <CheckCircle className="w-6 h-6 text-emerald-400" />
                      <span className="text-emerald-450 text-xs font-sans font-bold block mt-1">✓ Return Response Saved</span>
                      <span className="text-zinc-455 text-[10px] font-mono uppercase tracking-wider">
                        Response:{" "}
                        <strong className="text-white font-black">
                          {myVote.vote === "yes" ? "Yes 👍" : myVote.vote === "maybe" ? "Maybe 😐" : "No 👎"}
                        </strong>
                      </span>
                    </div>
                  ) : isEditWindowOpen ? (
                    <div className="space-y-4 bg-zinc-950/40 border border-zinc-900/60 rounded-2xl p-5 shadow-inner">
                      <div className="text-center">
                        <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wide">Would you come back to this restaurant?</h4>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleRestaurantVoteSubmit("yes")}
                          disabled={submitting}
                          className="w-full h-11 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-emerald-400 font-sans font-bold text-xs uppercase tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          👍 Yes
                        </button>
                        <button
                          onClick={() => handleRestaurantVoteSubmit("maybe")}
                          disabled={submitting}
                          className="w-full h-11 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-amber-400 font-sans font-bold text-xs uppercase tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          😐 Maybe
                        </button>
                        <button
                          onClick={() => handleRestaurantVoteSubmit("no")}
                          disabled={submitting}
                          className="w-full h-11 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-900/60 text-rose-400 font-sans font-bold text-xs uppercase tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          👎 No
                        </button>
                      </div>
                      {errorMsg && <p className="text-[10px] font-mono text-rose-455 text-center">{errorMsg}</p>}
                    </div>
                  ) : (
                    <div className="bg-[#050505]/40 border border-zinc-900/80 rounded-2xl p-5 flex flex-col items-center justify-center gap-1.5 text-zinc-550">
                      <Lock className="w-4 h-4 text-zinc-650" />
                      <span className="text-[9px] font-mono uppercase font-black tracking-wider block">Memory Closed</span>
                    </div>
                  )}
                </div>
              )}

              {/* Aggregated Results */}
              <div className="border-t border-zinc-900/40 pt-5 space-y-3">
                <h4 className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest font-black px-1">Return Vote Breakdown</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-zinc-900/20 border border-zinc-900/40 rounded-xl p-3 text-center">
                    <span className="text-xl block">👍</span>
                    <span className="text-[9px] font-mono text-zinc-500 block uppercase mt-1">Yes</span>
                    <span className="text-sm font-black text-white font-mono mt-0.5 block">{yesCount}</span>
                  </div>
                  <div className="bg-zinc-900/20 border border-zinc-900/40 rounded-xl p-3 text-center">
                    <span className="text-xl block">😐</span>
                    <span className="text-[9px] font-mono text-zinc-500 block uppercase mt-1">Maybe</span>
                    <span className="text-sm font-black text-white font-mono mt-0.5 block">{maybeCount}</span>
                  </div>
                  <div className="bg-zinc-900/20 border border-zinc-900/40 rounded-xl p-3 text-center">
                    <span className="text-xl block">👎</span>
                    <span className="text-[9px] font-mono text-zinc-500 block uppercase mt-1">No</span>
                    <span className="text-sm font-black text-white font-mono mt-0.5 block">{noCount}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ⚽ FOOTBALL MATCH RESULTS */}
          {memory.memory_type === "football" && (
            <div className="space-y-6">
              {/* Result display or Host Form */}
              {matchResult ? (
                // Final Score Immutable Block
                <div className="bg-[#050505]/40 border border-zinc-900/80 rounded-2xl p-5 space-y-4">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest font-black block text-center">Final Score</span>
                  <div className="flex items-center justify-center gap-8">
                    <div className="text-center">
                      <span className="text-4xl font-black text-white font-mono">{matchResult.team_a_score}</span>
                      <p className="text-[9px] font-mono text-zinc-500 mt-1 uppercase tracking-wider font-bold">Team A</p>
                    </div>
                    <span className="text-zinc-700 font-mono font-black text-xl">—</span>
                    <div className="text-center">
                      <span className="text-4xl font-black text-white font-mono">{matchResult.team_b_score}</span>
                      <p className="text-[9px] font-mono text-zinc-500 mt-1 uppercase tracking-wider font-bold">Team B</p>
                    </div>
                  </div>
                  <div className="text-center pt-2">
                    <span className="text-[10px] font-mono font-bold text-[#FF6B2C] bg-[#FF6B2C]/10 border border-[#FF6B2C]/20 px-4 py-1.5 rounded-full uppercase tracking-wider">
                      {matchResult.team_a_score > matchResult.team_b_score
                        ? "🏆 Team A Wins"
                        : matchResult.team_a_score < matchResult.team_b_score
                        ? "🏆 Team B Wins"
                        : "🤝 Draw Match"}
                    </span>
                  </div>
                </div>
              ) : isHost && isEditWindowOpen ? (
                // Host inputs scores
                <div className="space-y-4 bg-zinc-950/40 border border-zinc-900/60 rounded-2xl p-5 shadow-inner">
                  <div className="text-center">
                    <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wide">Record Final Score</h4>
                    <p className="text-[10px] text-zinc-550 mt-0.5">Submit match result (read-only once saved)</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 text-center space-y-1.5">
                      <label className="text-[9px] font-mono text-zinc-550 uppercase tracking-wider block font-bold">Team A</label>
                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={scoreA}
                        onChange={(e) => setScoreA(e.target.value)}
                        disabled={submitting}
                        className="w-full h-12 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-center text-xl font-black font-mono outline-none focus:border-[#FF6B2C] transition-colors"
                      />
                    </div>
                    <span className="text-zinc-650 font-mono font-black text-lg shrink-0">—</span>
                    <div className="flex-1 text-center space-y-1.5">
                      <label className="text-[9px] font-mono text-zinc-550 uppercase tracking-wider block font-bold">Team B</label>
                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={scoreB}
                        onChange={(e) => setScoreB(e.target.value)}
                        disabled={submitting}
                        className="w-full h-12 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-center text-xl font-black font-mono outline-none focus:border-[#FF6B2C] transition-colors"
                      />
                    </div>
                  </div>
                  {errorMsg && <p className="text-[10px] font-mono text-rose-450 text-center">{errorMsg}</p>}
                  <button
                    onClick={handleMatchResultSubmit}
                    disabled={submitting || scoreA === "" || scoreB === ""}
                    className="w-full h-10 rounded-xl bg-white hover:bg-zinc-100 active:scale-[0.98] text-black font-sans font-black text-xs uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer"
                  >
                    {submitting ? "Saving Result…" : "Save Result"}
                  </button>
                </div>
              ) : (
                // Waiting for Host Score
                <div className="bg-[#050505]/40 border border-zinc-900/80 rounded-2xl p-6 flex flex-col items-center gap-2 text-zinc-500 text-center">
                  <Lock className="w-5 h-5 text-zinc-650" />
                  <span className="text-xs font-mono uppercase font-black tracking-wider text-zinc-500">Result Not Recorded</span>
                  <p className="text-[10px] text-zinc-600 mt-1">Waiting for the plan host to save the final score.</p>
                </div>
              )}
            </div>
          )}

          {/* 🏸 BADMINTON WINS/LOSSES */}
          {memory.memory_type === "badminton" && (
            <div className="space-y-6">
              {isAttendee && (
                <div className="space-y-3">
                  {myBadmintonResult ? (
                    // Read-only individual summary
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-5 flex flex-col items-center justify-center gap-1.5">
                      <CheckCircle className="w-6 h-6 text-emerald-400" />
                      <span className="text-emerald-450 text-xs font-sans font-bold block mt-1">✓ Results Recorded</span>
                      <div className="text-center mt-2 space-y-1">
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Your Session</p>
                        <p className="text-lg font-black text-white font-mono">
                          Wins: <span className="text-emerald-400">{myBadmintonResult.wins}</span> • Losses: <span className="text-rose-400">{myBadmintonResult.losses}</span>
                        </p>
                      </div>
                    </div>
                  ) : isEditWindowOpen ? (
                    // Interactive win/loss counter
                    <div className="space-y-4 bg-zinc-950/40 border border-zinc-900/60 rounded-2xl p-5 shadow-inner">
                      <div className="text-center">
                        <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wide">How did your session go?</h4>
                      </div>
                      
                      <div className="flex items-center justify-center gap-6 py-2">
                        {/* Wins counter */}
                        <div className="text-center space-y-2">
                          <span className="text-[9px] font-mono text-zinc-555 uppercase tracking-wider block font-bold">Wins</span>
                          <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-1.5">
                            <button
                              type="button"
                              onClick={() => setWinsInput(w => Math.max(0, w - 1))}
                              className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-855 text-zinc-400 hover:text-white font-bold flex items-center justify-center cursor-pointer active:scale-90 select-none"
                            >
                              -
                            </button>
                            <span className="w-6 text-base font-black text-white font-mono">{winsInput}</span>
                            <button
                              type="button"
                              onClick={() => setWinsInput(w => w + 1)}
                              className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-855 text-zinc-400 hover:text-white font-bold flex items-center justify-center cursor-pointer active:scale-90 select-none"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Losses counter */}
                        <div className="text-center space-y-2">
                          <span className="text-[9px] font-mono text-zinc-555 uppercase tracking-wider block font-bold">Losses</span>
                          <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-1.5">
                            <button
                              type="button"
                              onClick={() => setLossesInput(l => Math.max(0, l - 1))}
                              className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-855 text-zinc-400 hover:text-white font-bold flex items-center justify-center cursor-pointer active:scale-90 select-none"
                            >
                              -
                            </button>
                            <span className="w-6 text-base font-black text-white font-mono">{lossesInput}</span>
                            <button
                              type="button"
                              onClick={() => setLossesInput(l => l + 1)}
                              className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-855 text-zinc-400 hover:text-white font-bold flex items-center justify-center cursor-pointer active:scale-90 select-none"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      {errorMsg && <p className="text-[10px] font-mono text-rose-450 text-center">{errorMsg}</p>}
                      <button
                        onClick={handleBadmintonResultSubmit}
                        disabled={submitting}
                        className="w-full h-10 rounded-xl bg-white hover:bg-zinc-100 active:scale-[0.98] text-black font-sans font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
                      >
                        {submitting ? "Saving Result…" : "Save Result"}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-[#050505]/40 border border-zinc-900/80 rounded-2xl p-5 flex flex-col items-center justify-center gap-1.5 text-zinc-555">
                      <Lock className="w-4 h-4 text-zinc-650" />
                      <span className="text-[9px] font-mono uppercase font-black tracking-wider block">Memory Closed</span>
                    </div>
                  )}
                </div>
              )}

              {/* Group summary wins/losses */}
              <div className="border-t border-zinc-900/40 pt-5 space-y-3">
                <h4 className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest font-black px-1">Group Summary</h4>
                <div className="space-y-2">
                  {attendeeUsers.map((au) => {
                    const resObj = badmintonResultsList.find(r => r.user_id === au.userId);
                    return (
                      <div
                        key={au.userId}
                        className="bg-zinc-900/20 border border-zinc-900/40 rounded-xl p-3 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <img src={au.avatar} className="w-5 h-5 rounded-full object-cover" alt="" />
                          <span className="font-semibold text-zinc-350">{au.fullName}</span>
                        </div>
                        <span className="font-bold font-mono text-white bg-zinc-900 border border-zinc-800 px-2.5 py-0.5 rounded-md text-[10px]">
                          {resObj ? `${resObj.wins}W • ${resObj.losses}L` : "Pending ⏳"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* MVP Voting Checklist (Only if result exists) */}
          {((memory.memory_type === "football" && hasResult) || (memory.memory_type === "badminton" && !!myBadmintonResult)) && isAttendee && (
            <div className="border-t border-zinc-900/40 pt-5 space-y-4">
              {myMvpVote ? (
                // Voted Indicator
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-455" />
                  <span className="text-zinc-400 text-xs">
                    ✓ Your MVP vote recorded
                  </span>
                </div>
              ) : isEditWindowOpen ? (
                // Vote Picker checklist
                <div className="space-y-3 bg-zinc-950/40 border border-zinc-900/60 rounded-2xl p-5 shadow-inner">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wide text-center">Vote MVP</h4>
                    <p className="text-[10px] text-zinc-555 mt-0.5 text-center">Nominate the standout player</p>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {attendeeUsers
                      .filter(au => au.userId !== activeUserId) // Can't vote for self
                      .map((au) => (
                        <button
                          key={au.userId}
                          onClick={() => handleMvpVoteSubmit(au.userId)}
                          disabled={submitting}
                          className="w-full flex items-center justify-between p-2.5 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-750 rounded-xl transition-all text-left group cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <img src={au.avatar} className="w-5 h-5 rounded-full object-cover" alt="" />
                            <span className="text-xs font-semibold text-zinc-300 group-hover:text-white transition-colors">{au.fullName}</span>
                          </div>
                          <Award className="w-3.5 h-3.5 text-zinc-650 group-hover:text-[#FF6B2C] transition-colors" />
                        </button>
                      ))}
                    {attendeeUsers.filter(au => au.userId !== activeUserId).length === 0 && (
                      <p className="text-[10px] text-zinc-655 italic text-center py-2">No other attendees to vote for.</p>
                    )}
                  </div>
                </div>
              ) : null}

              {/* MVP Vote Leaderboard Results */}
              <div className="space-y-2.5">
                <h4 className="text-[9px] font-mono text-zinc-555 uppercase tracking-widest font-black px-1 flex items-center gap-1.5">
                  <span>🏆 MVP Leaderboard</span>
                </h4>
                {sortedMvpLeaders.length === 0 ? (
                  <p className="text-[10px] text-zinc-600 font-sans italic px-1">No MVP votes received yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {sortedMvpLeaders.map((leader) => (
                      <div
                        key={leader.userId}
                        className="bg-[#050505]/20 border border-zinc-900/40 rounded-xl p-3 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={leader.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=UA&backgroundColor=ff8b66`}
                            className="w-5 h-5 rounded-full object-cover"
                            alt=""
                          />
                          <span className="font-semibold text-zinc-350">{leader.fullName}</span>
                        </div>
                        <span className="font-bold font-mono text-white bg-zinc-900 border border-zinc-800 px-2.5 py-0.5 rounded-md text-[10px]">
                          {leader.votes} {leader.votes === 1 ? "vote" : "votes"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Common Attendees Footer */}
          {attendeeUsers.length > 0 && (
            <div className="border-t border-zinc-900/40 pt-5 space-y-3">
              <h4 className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest font-black px-0.5">Attendees</h4>
              <div className="flex flex-wrap gap-2">
                {attendeeUsers.map((u) => (
                  <div key={u.userId} className="flex items-center gap-1.5 bg-zinc-900/30 border border-zinc-900/50 rounded-xl px-2.5 py-1">
                    <img src={u.avatar} alt="" className="w-4 h-4 rounded-full object-cover" />
                    <span className="text-[10px] font-semibold text-zinc-400">{u.fullName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

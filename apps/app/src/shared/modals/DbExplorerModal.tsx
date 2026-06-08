import React from "react";
import { Database } from "lucide-react";
import { User, DbCircle, DbCircleMember, DbPlan, DbPlanParticipant, DbTransaction, DbMemory, DbMemoryAttendee, DbMemoryMovieVerdict, DbMemoryRestaurantVote, DbMemoryMatchResult, DbMemoryMvpVote } from "../../core/types";

interface DbExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDbTable: string;
  setSelectedDbTable: (table: string) => void;
  dbUsers: User[];
  dbCircles: DbCircle[];
  dbCircleMembers: DbCircleMember[];
  dbPlans: DbPlan[];
  dbPlanParticipants: DbPlanParticipant[];
  dbTransactions: DbTransaction[];
  dbMemories: DbMemory[];
  dbMemoryAttendees: DbMemoryAttendee[];
  dbMemoryMovieVerdicts: DbMemoryMovieVerdict[];
  dbMemoryRestaurantVotes: DbMemoryRestaurantVote[];
  dbMemoryMatchResults: DbMemoryMatchResult[];
  dbMemoryMvpVotes: DbMemoryMvpVote[];
}

export default function DbExplorerModal({
  isOpen,
  onClose,
  selectedDbTable,
  setSelectedDbTable,
  dbUsers,
  dbCircles,
  dbCircleMembers,
  dbPlans,
  dbPlanParticipants,
  dbTransactions,
  dbMemories,
  dbMemoryAttendees,
  dbMemoryMovieVerdicts,
  dbMemoryRestaurantVotes,
  dbMemoryMatchResults,
  dbMemoryMvpVotes
}: DbExplorerModalProps) {
  if (!isOpen) return null;

  const tables = [
    "users",
    "circles",
    "circle_members",
    "plans",
    "plan_participants",
    "transactions",
    "memories",
    "memory_attendees",
    "movie_verdicts",
    "restaurant_votes",
    "match_results",
    "mvp_votes"
  ];

  return (
    <div id="db_explorer_slide_panel" className="absolute inset-0 bg-[#0C0C0E]/99 z-45 flex flex-col animate-fade-in text-zinc-100 font-sans">
      <div className="p-4 flex items-center justify-between border-b border-zinc-900 bg-zinc-950 shrink-0">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-brand-orange" />
          <h3 className="text-xs font-mono font-bold text-zinc-200">PLANLESS_SYSTEM_DB</h3>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded bg-zinc-900 border border-zinc-850 focus:outline-none"
        >
          Exit
        </button>
      </div>

      <div className="flex border-b border-zinc-900/60 bg-zinc-950 shrink-0 overflow-x-auto no-scrollbar">
        {tables.map(table => (
          <button
            key={table}
            onClick={() => setSelectedDbTable(table)}
            className={`flex-grow min-w-[70px] py-3 px-1 text-center text-[9px] font-mono uppercase focus:outline-none relative ${selectedDbTable === table ? "text-brand-orange bg-zinc-900/40 font-bold" : "text-zinc-500"}`}
          >
            {table.substring(0, 10)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 font-mono text-[10px] leading-normal text-left">
        <pre className="text-brand-peach/90 select-all font-mono whitespace-pre-wrap">
          {selectedDbTable === "users" && JSON.stringify(dbUsers, null, 2)}
          {selectedDbTable === "circles" && JSON.stringify(dbCircles, null, 2)}
          {selectedDbTable === "circle_members" && JSON.stringify(dbCircleMembers, null, 2)}
          {selectedDbTable === "plans" && JSON.stringify(dbPlans, null, 2)}
          {selectedDbTable === "plan_participants" && JSON.stringify(dbPlanParticipants, null, 2)}
          {selectedDbTable === "transactions" && JSON.stringify(dbTransactions, null, 2)}
          {selectedDbTable === "memories" && JSON.stringify(dbMemories, null, 2)}
          {selectedDbTable === "memory_attendees" && JSON.stringify(dbMemoryAttendees, null, 2)}
          {selectedDbTable === "movie_verdicts" && JSON.stringify(dbMemoryMovieVerdicts, null, 2)}
          {selectedDbTable === "restaurant_votes" && JSON.stringify(dbMemoryRestaurantVotes, null, 2)}
          {selectedDbTable === "match_results" && JSON.stringify(dbMemoryMatchResults, null, 2)}
          {selectedDbTable === "mvp_votes" && JSON.stringify(dbMemoryMvpVotes, null, 2)}
        </pre>
      </div>
    </div>
  );
}

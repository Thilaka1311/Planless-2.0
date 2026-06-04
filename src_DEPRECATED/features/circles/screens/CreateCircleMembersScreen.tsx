import React, { useState } from 'react';
import { motion } from "motion/react";
import { Search, ArrowLeft, ArrowRight, Check, X, User } from "lucide-react";
import { User as DbUser } from "../../../core/types";
import { getInitialsAvatar } from "../../../demo/seedData";

interface CreateCircleMembersScreenProps {
  dbUsers: DbUser[];
  activeUserId: string;
  onNext: (selectedIds: string[]) => void;
  onBack: () => void;
}

export const CreateCircleMembersScreen: React.FC<CreateCircleMembersScreenProps> = ({
  dbUsers,
  activeUserId,
  onNext,
  onBack
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filter out the active user themselves and apply search query
  const eligibleUsers = dbUsers.filter(user => {
    const isSelf = user.user_id === activeUserId;
    if (isSelf) return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      user.full_name.toLowerCase().includes(q) ||
      user.username.toLowerCase().includes(q) ||
      ((user as any).phone_number || "").replace(/[^0-9]/g, "").includes(q.replace(/[^0-9]/g, ""));
    return matchesSearch;
  });

  const toggleUserSelect = (userId: string) => {
    setSelectedIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  const removeSelected = (userId: string) => {
    setSelectedIds(prev => prev.filter(id => id !== userId));
  };

  const selectedUsers = dbUsers.filter(u => selectedIds.includes(u.user_id));

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5 flex flex-col h-full min-h-[500px]"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-lg font-display font-bold text-zinc-100 tracking-tight">Add Members</h2>
          <p className="text-[10px] text-zinc-500 font-sans">Step 1 of 2 • Select circle participants</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-500">
          <Search className="w-4 h-4" />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or username..."
          className="w-full bg-zinc-900 border border-zinc-850 rounded-2xl pl-10 pr-4 py-3 text-xs text-white focus:outline-none focus:border-zinc-700 transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute inset-y-0 right-3 flex items-center text-zinc-500 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Selected Members Horizontal Roll */}
      {selectedUsers.length > 0 && (
        <div className="space-y-2 animate-fade-in">
          <label className="text-[9px] text-zinc-400 font-display font-semibold uppercase tracking-widest block">
            Selected ({selectedUsers.length})
          </label>
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
            {selectedUsers.map(user => (
              <div key={user.user_id} className="relative shrink-0 flex flex-col items-center gap-1 group">
                <div className="w-10 h-10 rounded-2xl overflow-hidden border border-zinc-800 shadow-md">
                  <img
                    src={user.profile_photo || getInitialsAvatar(user.full_name)}
                    className="w-full h-full object-cover"
                    alt={user.full_name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getInitialsAvatar(user.full_name);
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeSelected(user.user_id)}
                  className="absolute -top-1 -right-1 bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white rounded-full w-4.5 h-4.5 flex items-center justify-center shadow-lg transition-all"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
                <span className="text-[8px] text-zinc-400 max-w-[45px] truncate text-center">
                  {user.full_name.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends/Users List */}
      <div className="flex-1 overflow-y-auto no-scrollbar space-y-2.5 pb-24">
        <label className="text-[9px] text-zinc-500 font-display font-semibold uppercase tracking-widest block">
          Suggestions
        </label>
        {eligibleUsers.length === 0 ? (
          <div className="text-center py-8 bg-zinc-900/20 border border-dashed border-zinc-850 rounded-2xl">
            <User className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
            <p className="text-xs text-zinc-500">No users found</p>
          </div>
        ) : (
          eligibleUsers.map(user => {
            const isSelected = selectedIds.includes(user.user_id);
            return (
              <button
                key={user.user_id}
                type="button"
                onClick={() => toggleUserSelect(user.user_id)}
                className={`w-full p-3.5 flex items-center justify-between rounded-2xl border text-left transition-all duration-300 ${
                  isSelected 
                    ? "bg-[#ff8b66]/10 border-[#ff8b66]/40 shadow-[0_4px_15px_rgba(255,139,102,0.08)]" 
                    : "bg-zinc-900/30 border-zinc-900/80 hover:bg-zinc-900/60 hover:border-zinc-850"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-9 h-9 rounded-xl overflow-hidden border border-zinc-800">
                    <img
                      src={user.profile_photo || getInitialsAvatar(user.full_name)}
                      className="w-full h-full object-cover"
                      alt={user.full_name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getInitialsAvatar(user.full_name);
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-white truncate">{user.full_name}</h4>
                    <p className="text-[10px] text-zinc-500 font-sans mt-0.5 truncate">@{user.username}</p>
                  </div>
                </div>

                <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                  isSelected 
                    ? "bg-[#ff8b66] border-[#ff8b66] text-black" 
                    : "border-zinc-700 bg-zinc-950 text-transparent"
                }`}>
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Floating Action Button */}
      <div className="sticky bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-900/80 pt-4 pb-6 mt-auto flex justify-end">
        <button
          type="button"
          disabled={selectedIds.length === 0}
          onClick={() => onNext(selectedIds)}
          className={`flex items-center gap-2 px-5 py-3 rounded-full font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-lg ${
            selectedIds.length > 0
              ? "bg-[#ff8b66] text-black hover:scale-[1.03] active:scale-[0.98]"
              : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
          }`}
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

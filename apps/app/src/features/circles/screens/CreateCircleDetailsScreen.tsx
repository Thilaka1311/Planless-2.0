import React, { useState } from 'react';
import { motion } from "motion/react";
import { ArrowLeft, Check, Camera, Users, Info, X } from "lucide-react";
import { User as DbUser } from "../../../core/types";
import { getInitialsAvatar } from "../../../demo/seedData";

interface CreateCircleDetailsScreenProps {
  selectedMemberIds: string[];
  dbUsers: DbUser[];
  onSubmit: (name: string, description: string, image: string | null) => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

export const CreateCircleDetailsScreen: React.FC<CreateCircleDetailsScreenProps> = ({
  selectedMemberIds,
  dbUsers,
  onSubmit,
  onBack,
  isSubmitting = false
}) => {
  const [circleName, setCircleName] = useState("");
  const [circleDescription, setCircleDescription] = useState("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const selectedUsers = dbUsers.filter(u => selectedMemberIds.includes(u.user_id));

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setUploadedImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!circleName.trim()) return;
    onSubmit(circleName, circleDescription, uploadedImage);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 flex flex-col h-full min-h-[500px]"
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
          <h2 className="text-lg font-display font-bold text-zinc-100 tracking-tight">Circle Details</h2>
          <p className="text-[10px] text-zinc-500 font-sans">Step 2 of 2 • Customize group presentation</p>
        </div>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-6 flex-1 pb-24">
        {/* Photo Upload Avatar Box */}
        <div className="flex flex-col items-center justify-center py-4 relative">
          <div className="relative group w-24 h-24 rounded-[32px] overflow-hidden border border-zinc-800 shadow-xl bg-zinc-900 flex items-center justify-center">
            {uploadedImage ? (
              <img 
                src={uploadedImage} 
                className="w-full h-full object-cover" 
                alt="Circle Preview" 
              />
            ) : circleName.trim() ? (
              <img 
                src={getInitialsAvatar(circleName)} 
                className="w-full h-full object-cover" 
                alt="Circle Initial Preview" 
              />
            ) : (
              <Users className="w-8 h-8 text-zinc-650" />
            )}

            <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white">
              <Camera className="w-5 h-5 mb-1" />
              <span className="text-[8px] uppercase tracking-wider font-semibold">Upload</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </label>
          </div>
          {uploadedImage && (
            <button
              type="button"
              onClick={() => setUploadedImage(null)}
              className="absolute top-1 right-[calc(50%-55px)] bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white rounded-full p-1 shadow-lg transition-all"
              title="Remove photo"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <span className="text-[9px] text-zinc-500 font-sans mt-2.5">
            Tap image cover to upload a photo
          </span>
        </div>

        {/* Inputs Section */}
        <div className="space-y-4 bg-zinc-900/35 border border-zinc-900 p-4.5 rounded-3xl">
          {/* Circle Name */}
          <div className="space-y-1.5">
            <label className="text-[9px] text-[#ff8b66] font-display font-semibold uppercase tracking-widest block">
              Circle Name
            </label>
            <input
              id="circle_name_input"
              type="text"
              value={circleName}
              onChange={(e) => setCircleName(e.target.value)}
              placeholder="e.g. Office Lunch Club, Matchday Football"
              className="w-full bg-zinc-950 border border-zinc-850 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#ff8b66]/50 transition-colors"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Circle Description */}
          <div className="space-y-1.5">
            <label className="text-[9px] text-zinc-400 font-display font-semibold uppercase tracking-widest block">
              Description (Optional)
            </label>
            <textarea
              id="circle_description_input"
              value={circleDescription}
              onChange={(e) => setCircleDescription(e.target.value)}
              placeholder="Add a bio or context for your circle members..."
              rows={3}
              className="w-full bg-zinc-950 border border-zinc-850 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-zinc-700 transition-colors resize-none"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Group Preview (Members avatars horizontal row) */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-zinc-550" />
            <label className="text-[9px] text-zinc-400 font-display font-semibold uppercase tracking-widest block">
              Inviting ({selectedUsers.length} members)
            </label>
          </div>
          <div className="flex items-center -space-x-2.5 overflow-hidden py-1 px-1">
            {selectedUsers.map((user, idx) => (
              <div 
                key={user.user_id} 
                className="w-8 h-8 rounded-full overflow-hidden border border-zinc-950 shadow-md relative shrink-0"
                style={{ zIndex: 10 - idx }}
                title={user.full_name}
              >
                <img
                  src={user.profile_photo || getInitialsAvatar(user.full_name)}
                  className="w-full h-full object-cover"
                  alt={user.full_name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = getInitialsAvatar(user.full_name);
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Floating Bottom Create Button */}
        <div className="sticky bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-900/80 pt-4 pb-6 mt-auto flex justify-end">
          <button
            type="submit"
            disabled={!circleName.trim() || isSubmitting}
            className={`flex items-center gap-2 px-5 py-3 rounded-full font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-lg ${
              circleName.trim() && !isSubmitting
                ? "bg-[#ff8b66] text-black hover:scale-[1.03] active:scale-[0.98]"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            }`}
          >
            <span>{isSubmitting ? "Creating..." : "Create Circle"}</span>
            <Check className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </form>
    </motion.div>
  );
};

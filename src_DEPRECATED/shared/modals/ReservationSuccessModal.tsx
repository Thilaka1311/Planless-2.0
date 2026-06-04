import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plan } from "../../core/types";

interface ReservationSuccessModalProps {
  showPaymentSuccess: Plan | null;
  onClose: () => void;
  setActiveTab: (tab: any) => void;
}

export default function ReservationSuccessModal({
  showPaymentSuccess,
  onClose,
  setActiveTab
}: ReservationSuccessModalProps) {
  return (
    <AnimatePresence>
      {showPaymentSuccess && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-neutral-950 z-50 flex flex-col items-center justify-between p-8 pb-12 text-zinc-100"
        >
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 my-auto">
            <div className="w-24 h-24 rounded-full bg-emerald-500/10 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-xl text-3xl font-bold animate-pulse">✓</div>
            <div className="space-y-2">
              <h3 className="text-4xl font-display font-black text-white">Plan Confirmed</h3>
              <p className="text-xs text-zinc-500 font-mono">RESERVATION SATELLITE COORDINATE ACTIVE</p>
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              setActiveTab("plans");
            }}
            className="w-full py-4.5 rounded-full bg-brand-orange text-white font-extrabold text-xs uppercase tracking-widest focus:outline-none hover:bg-opacity-90 transition-colors"
          >
            Go to Plans
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

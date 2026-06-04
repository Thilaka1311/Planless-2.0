import React from "react";
import { NotificationItem } from "../../core/types";

interface NotificationsTrayModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredNotifications: NotificationItem[];
  handleAcceptInviteFromNotif: (notif: NotificationItem) => void;
}

export default function NotificationsTrayModal({
  isOpen,
  onClose,
  filteredNotifications,
  handleAcceptInviteFromNotif
}: NotificationsTrayModalProps) {
  if (!isOpen) return null;

  return (
    <div id="notifications_tray_overlay" className="absolute inset-0 bg-[#0C0C0E]/98 z-40 flex flex-col animate-fade-in text-left">
      <div className="p-4 flex items-center justify-between border-b border-zinc-900 bg-zinc-950 shrink-0">
        <h3 className="text-sm font-display font-semibold text-zinc-200">Notifications</h3>
        <button onClick={onClose} className="text-xs text-zinc-500 hover:text-white focus:outline-none">Close</button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
        {filteredNotifications.length === 0 ? (
          <p className="text-center text-xs text-zinc-650 py-16 font-mono">Tray clear</p>
        ) : (
          filteredNotifications.map(notif => (
            <div key={notif.id} className="p-3.5 bg-zinc-900 border border-zinc-850 rounded-2xl space-y-2 animate-slide-up">
              <div className="flex items-start justify-between gap-3 text-xs">
                <p className="text-zinc-200 font-medium">{notif.title}</p>
                <span className="text-[9px] font-mono text-zinc-500 shrink-0">{notif.relativeTime}</span>
              </div>
              {!notif.settled && notif.actionText && (
                <button
                  onClick={() => handleAcceptInviteFromNotif(notif)}
                  className="bg-[#ff8b66] text-black text-[9px] font-black uppercase font-mono px-3.5 py-1 rounded focus:outline-none"
                >
                  Accept
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

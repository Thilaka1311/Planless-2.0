import React, { useState } from "react";
import { Plus, ArrowUpRight, ArrowDownLeft, MoreVertical, Settings, ChevronRight } from "lucide-react";
import { Transaction } from "../../../core/types";
import { TransactionHistoryScreen } from "./TransactionHistoryScreen";

interface WalletScreenProps {
  walletBalance: number;
  transactions: Transaction[];
  userProfile: any;
  setShowDepositModal: (show: boolean) => void;
  setActiveTab?: (tab: string) => void;
}

export const WalletScreen: React.FC<WalletScreenProps> = ({
  walletBalance,
  transactions,
  setShowDepositModal,
  setActiveTab
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [subView, setSubView] = useState<"main" | "history">("main");

  // Show only the 5 most recent transactions on the main screen
  const recentTransactions = transactions.slice(0, 5);

  if (subView === "history") {
    return (
      <TransactionHistoryScreen
        transactions={transactions}
        onBack={() => setSubView("main")}
      />
    );
  }

  return (
    <div id="subview_payments_wallet" className="space-y-5 animate-fade-in text-left pb-0 px-1">
      {/* Premium Compact Header */}
      <div className="flex items-center justify-between pb-1.5 pt-1.5 relative">
        <div>
          <h2 className="text-xl font-display font-black text-zinc-100 tracking-tight">Wallet</h2>
          <p className="text-[10px] text-zinc-500 font-sans mt-0.5">Manage your balance and transactions</p>
        </div>

        <div className="relative">
          <button
            id="wallet_menu_btn"
            onClick={() => setShowMenu(prev => !prev)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all cursor-pointer border border-zinc-900/60"
            aria-label="More options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-9 z-50 bg-[#0e0e11] border border-zinc-850 rounded-2xl shadow-xl overflow-hidden min-w-[140px] animate-fade-in">
              <button
                id="wallet_settings_btn"
                onClick={() => { setActiveTab?.("profile"); setShowMenu(false); }}
                className="flex items-center gap-2.5 w-full px-4 py-3 text-left text-xs font-sans text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-zinc-400" />
                <span>Settings</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Redesigned Center-Aligned Balance Card */}
      <div
        id="wallet_balance_card"
        className="bg-gradient-to-b from-zinc-900/40 to-zinc-950/20 border border-zinc-900/80 rounded-[28px] p-8 flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden shadow-lg"
      >
        <div className="space-y-2">
          <span className="text-[11px] font-sans font-medium text-zinc-500 tracking-wide block uppercase">
            Available Balance
          </span>
          <h1 className="text-5xl font-sans font-black text-white select-all leading-none tracking-tight">
            ₹{walletBalance.toLocaleString("en-IN")}
          </h1>
        </div>

        <button
          id="add_money_btn"
          onClick={() => setShowDepositModal(true)}
          className="bg-white hover:bg-zinc-100 text-black font-semibold text-xs px-5 py-2.5 rounded-full transition-all duration-300 shadow-[0_4px_15px_rgba(255,255,255,0.06)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add money</span>
        </button>
      </div>

      {/* TRANSACTION HISTORY SECTION HEADER WITH SEE ALL BUTTON */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[11px] font-sans font-semibold uppercase tracking-[0.12em] text-zinc-500">
            Transaction History
          </h3>
          <button
            onClick={() => setSubView("history")}
            className="flex items-center gap-0.5 text-[11px] text-[#ff8b66] hover:text-white hover:underline transition-all cursor-pointer font-sans font-semibold"
          >
            <span>See All</span>
            <ChevronRight className="w-3 h-3 stroke-[2.5]" />
          </button>
        </div>

        {transactions.length === 0 ? (
          <p className="text-[11px] text-zinc-500 italic p-4 text-center bg-zinc-950/20 border border-dashed border-zinc-900 rounded-[20px]">
            No transactions posted yet.
          </p>
        ) : (
          <div id="transactions_list" className="space-y-0.5 divide-y divide-zinc-900/60">
            {recentTransactions.map((tx) => {
              const isCredit = tx.type === "credit";
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-4 first:pt-0 last:pb-0 hover:bg-zinc-900/10 px-1 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${isCredit
                        ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/10"
                        : "bg-[#ff8b66]/5 text-[#ff8b66] border-[#ff8b66]/10"
                        }`}
                    >
                      {isCredit ? (
                        <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-zinc-200 truncate">{tx.title}</h4>
                      <span className="text-[10px] text-zinc-500 block mt-0.5 font-sans">
                        {tx.timestamp}
                      </span>
                    </div>
                  </div>

                  <div className={`font-sans text-xs font-bold shrink-0 ${isCredit ? "text-emerald-400" : "text-zinc-200"
                    }`}>
                    {isCredit ? "+" : "−"} ₹{tx.amount.toLocaleString("en-IN")}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

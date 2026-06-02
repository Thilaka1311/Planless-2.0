import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { Transaction, DbTransaction, User } from "../../../core/types";
import { mapTransactionsToLegacy } from "../../../lib/mappers";
import { useProfileStore } from "../../profile/state/ProfileContext";
import { insertTransaction } from "../../../lib/db";

interface WalletState {
  walletBalance: number;
  setWalletBalance: React.Dispatch<React.SetStateAction<number>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  dbTransactions: DbTransaction[];
  setDbTransactions: React.Dispatch<React.SetStateAction<DbTransaction[]>>;
  depositFunds: (amount: number, activeUserId: string, dbUsers: User[]) => Promise<void>;
  deductFunds: (amount: number, receiverId: string, planId: string | null, activeUserId: string, dbUsers: User[]) => Promise<void>;
  refreshTransactions: () => Promise<void>;
}

const WalletContext = createContext<WalletState | undefined>(undefined);

export const WalletProvider = ({ 
  children, 
  userId = "" 
}: { 
  children: ReactNode; 
  userId?: string;
}) => {
  const [walletBalance, setWalletBalance] = useState(0);
  const [dbTransactions, setDbTransactions] = useState<DbTransaction[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  const { activeUserUuid } = useProfileStore();

  const refreshTransactions = useCallback(async () => {
    try {
      const res = await fetch("/api/db/fetch-all");
      if (res.ok) {
        const json = await res.json();
        if (json.configured && !json.tables_missing) {
          const d = json.data || {};
          const fetchedTxs = d.transactions || [];
          const allDbUsers = d.users || [];
          setDbTransactions(fetchedTxs);
          setTransactions(mapTransactionsToLegacy(fetchedTxs, allDbUsers, userId, d.plans || []));
          setHasLoaded(true);
        }
      }
    } catch (err) {
      console.error("[WalletContext refreshTransactions] Failed:", err);
    }
  }, [userId]);

  // Reload transactions on startup / active user UUID change
  useEffect(() => {
    if (activeUserUuid) {
      refreshTransactions();
    }
  }, [activeUserUuid, refreshTransactions]);

  useEffect(() => {
    if (!activeUserUuid) return;
    // Do not initialize balance to 0 on startup before fetching from Supabase
    if (!hasLoaded && dbTransactions.length === 0) return;

    const received = dbTransactions
      .filter((tx: any) => tx.receiver_id === activeUserUuid)
      .reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0);
    const paid = dbTransactions
      .filter((tx: any) => tx.sender_id === activeUserUuid)
      .reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0);
    const calculatedBalance = received - paid;
    setWalletBalance(calculatedBalance);

    // Required Logging: transaction count, incoming total, outgoing total, final balance
    console.log(`[Wallet Transactions Load]`);
    console.log(`- transaction count: ${dbTransactions.length}`);
    console.log(`- incoming total: ${received}`);
    console.log(`- outgoing total: ${paid}`);
    console.log(`- final balance: ${calculatedBalance}`);
  }, [dbTransactions, activeUserUuid, hasLoaded]);

  const depositFunds = async (amount: number, activeUserId: string, dbUsers: User[]) => {
    // Resolve active user's UUID for receiver_id (transactions must use users.id)
    const meUser = dbUsers.find(u => u.user_id === activeUserId || u.id === activeUserId);
    const meUuid = meUser?.id || activeUserId;

    const newTx = {
      transaction_id: `T_dep_${Date.now()}`,
      sender_id: "SYSTEM",
      receiver_id: meUuid,
      plan_id: null,
      amount,
      transaction_type: "deposit",
      status: "success",
      timestamp: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      created_at: new Date().toISOString()
    };
    
    await insertTransaction(newTx as any);
    await refreshTransactions();
  };

  const deductFunds = async (
    amount: number, 
    receiverId: string, 
    planId: string | null,
    activeUserId: string,
    dbUsers: User[]
  ) => {
    // Resolve UUIDs for sender and receiver (transactions must use users.id)
    const senderUser = dbUsers.find(u => u.user_id === activeUserId || u.id === activeUserId);
    const senderUuid = senderUser?.id || activeUserId;
    const receiverUser = dbUsers.find(u => u.user_id === receiverId || u.id === receiverId);
    const receiverUuid = receiverUser?.id || receiverId;

    const newTx = {
      transaction_id: `T_pay_${Date.now()}`,
      sender_id: senderUuid,
      receiver_id: receiverUuid,
      plan_id: planId,
      amount,
      transaction_type: "split_payment",
      status: "success",
      timestamp: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      created_at: new Date().toISOString()
    };
    
    await insertTransaction(newTx as any);
    await refreshTransactions();
  };

  return (
    <WalletContext.Provider value={{
      walletBalance, setWalletBalance,
      transactions, setTransactions,
      dbTransactions, setDbTransactions,
      depositFunds, deductFunds,
      refreshTransactions
    }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWalletStore = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWalletStore must be used within a WalletProvider");
  }
  return context;
};

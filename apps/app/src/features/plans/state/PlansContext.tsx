import React, { createContext, useContext, useState, ReactNode } from "react";
import { Plan, PlanMember, DbPlan, DbPlanParticipant, DbMemory, User } from "../../../core/types";
import { useProfileStore } from "../../profile/state/ProfileContext";
import { useCirclesStore } from "../../circles/state/CirclesContext";
import { insertParticipant, updateParticipantStatus, insertPlanReminder, syncUserStats, createRazorpayOrder, verifyRazorpayPayment, insertTransaction } from "../../../lib/db";
import { mapPlansToLegacyPlans } from "../../../lib/mappers";
import { calculateParticipantBreakdown, parseTimeToMinutes, normalizeStatus } from "../../../lib/participantStatus";

interface ParticipantCounts {
  host: number;
  going: number;
  waitlist: number;
  delivered: number;
  seen: number;
  skipped: number;
  passed: number;
  pending: number;  // delivered + seen (invited but not yet responded)
  total: number;
}

interface PlansContextType {
  plans: Plan[];
  setPlans: React.Dispatch<React.SetStateAction<Plan[]>>;
  dbPlans: DbPlan[];
  setDbPlans: React.Dispatch<React.SetStateAction<DbPlan[]>>;
  dbPlanParticipants: DbPlanParticipant[];
  setDbPlanParticipants: React.Dispatch<React.SetStateAction<DbPlanParticipant[]>>;
  dbMemories: any[];
  setDbMemories: React.Dispatch<React.SetStateAction<any[]>>;
  createPlan: (plan: DbPlan, invitees: string[]) => Promise<any>;
  joinPlan: (planId: string, userProfile: any) => Promise<void>;
  leavePlan: (planId: string, leaverId: string) => Promise<void>;
  passPlan: (planId: string, passerId: string) => Promise<void>;
  waitlistPlan: (planId: string, userProfile: any) => Promise<void>;
  sendReminder: (planId: string, userId: string) => void;
  ignoreReminder: (planId: string, ignoreUserId: string) => void;
  getHomeFeedPlans: (userId: string) => Plan[];
  getHubPlans: (userId: string) => Plan[];
  getParticipantCounts: (planId: string) => ParticipantCounts;
  refreshPlans: (targetTables?: string[]) => Promise<void>;
  markPlanSeen: (planId: string, userId: string) => Promise<void>;
  skipPlan: (planId: string, userId: string) => Promise<void>;
  rejoinPlan: (planId: string, userProfile: any) => Promise<void>;
  // New acceptance / payment / booking actions
  acceptPlan: (planId: string, userProfile: any) => Promise<void>;
  declinePlan: (planId: string, userProfile: any) => Promise<void>;
  hostPay: (planId: string, hostProfile: any) => Promise<boolean>;
  bookNow: (planId: string, hostProfile: any) => Promise<{ success: boolean; status?: string; error?: string }>;
  changePlanHost: (planId: string, newHostUuid: string, oldHostUuid: string) => Promise<void>;
  cancelPlan: (planId: string) => Promise<void>;
}

const PlansContext = createContext<PlansContextType | undefined>(undefined);

export const PlansProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [dbPlans, setDbPlans] = useState<DbPlan[]>([]);
  const [dbPlanParticipants, setDbPlanParticipants] = useState<DbPlanParticipant[]>([]);
  const [dbMemories, setDbMemories] = useState<any[]>([]);

  const { activeUserId: userId, dbUsers } = useProfileStore();

  const resolveUserUuid = (uId: string) => {
    const userObj = dbUsers.find(u => u.user_id === uId || u.id === uId);
    return userObj ? userObj.id : uId;
  };

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isUuid = (val: any) => typeof val === "string" && uuidRegex.test(val);

  const refreshPlans = async (targetTables?: string[]) => {
    try {
      const url = targetTables ? `/api/db/fetch-all?tables=${targetTables.join(",")}` : "/api/db/fetch-all";
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.configured && (!json.tables_missing || targetTables)) {
          const d = json.data || {};
          
          if (d.plans !== undefined) setDbPlans(d.plans);
          if (d.plan_participants !== undefined) setDbPlanParticipants(d.plan_participants);
          if (d.memories !== undefined) setDbMemories(d.memories);

          // Trigger plans update with latest values combined from state and fetched subset
          setDbPlans(currentPlans => {
            const finalPlans = d.plans !== undefined ? d.plans : currentPlans;
            setDbPlanParticipants(currentParticipants => {
              const finalParticipants = d.plan_participants !== undefined ? d.plan_participants : currentParticipants;
              setPlans(mapPlansToLegacyPlans(finalPlans, finalParticipants, dbUsers, userId, useCirclesStore().dbCircles));
              return finalParticipants;
            });
            return finalPlans;
          });
          console.log(`[PlansContext refreshPlans] Successfully refreshed plans state (targeted: ${targetTables?.join(",") || "all"}).`);
        }
      }
    } catch (err) {
      console.error("[PlansContext refreshPlans] Failed to fetch updated state:", err);
    }
  };

  const joinPlan = async (planId: string, userProfile: any) => {
    const matchedPlan = plans.find(p => p.id === planId);
    const planUuid = matchedPlan?.dbUuid || planId;
    const userUuid = userProfile.dbUuid || resolveUserUuid(userProfile.user_id || userId);

    if (!userUuid || !isUuid(userUuid)) {
      console.error(`[PlansContext] Cannot join plan: user UUID is missing or invalid:`, userUuid);
      return;
    }

    // Logging: status before action
    const existingBefore = dbPlanParticipants.find(p => (p.plan_id === planUuid || p.plan_id === planId) && (p.user_id === userUuid || p.user_id === userProfile.user_id));
    console.log(`[PlansContext] JOIN ACTION START for Plan: ${matchedPlan?.title || planId}, User: ${userProfile.name}`);
    console.log(`[PlansContext] Participant status BEFORE action:`, existingBefore ? existingBefore.status : "none (not invited/joined)");

    const isHost = matchedPlan?.hostId === "u_self" || matchedPlan?.creatorId === userUuid || matchedPlan?.creatorId === "u_self" || existingBefore?.status === "host";
    if (matchedPlan && matchedPlan.payment_required && !isHost) {
      // 1. Create Razorpay Order
      const amount = matchedPlan.cost;
      const orderRes = await createRazorpayOrder(amount, `receipt_${Date.now()}_${planId}`, { planId, userUuid });
      if (!orderRes || !orderRes.success || !orderRes.order) {
        console.error("[PlansContext] Failed to create Razorpay order.");
        return;
      }

      const order = orderRes.order;

      // 2. Load Razorpay Checkout Script
      const loadScript = () => {
        return new Promise<boolean>((resolve) => {
          if ((window as any).Razorpay) {
            resolve(true);
            return;
          }
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });
      };

      const scriptLoaded = await loadScript();
      if (!scriptLoaded) {
        console.error("[PlansContext] Razorpay checkout script failed to load.");
        return;
      }

      // 3. Open Razorpay Checkout and wait for verification
      const isVerified = await new Promise<boolean>((resolveVerify) => {
        const options = {
          key: orderRes.sandbox ? "rzp_test_mock" : (orderRes.order?.notes?.key || "rzp_test_mock"),
          amount: order.amount,
          currency: order.currency,
          name: "Planless",
          description: `RSVP Payment for ${matchedPlan.title}`,
          order_id: order.id,
          handler: async function (response: any) {
            console.log("[PlansContext] Razorpay checkout success payload received:", response);
            // 4. Verify payment with backend
            const verifyRes = await verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            // Required Logging: plan id, participant id, order id, payment id, verification result
            console.log(`[Razorpay Payment Audit]`);
            console.log(`- plan id: ${planId}`);
            console.log(`- participant id: ${existingBefore?.id || "new_participant"}`);
            console.log(`- order id: ${response.razorpay_order_id}`);
            console.log(`- payment id: ${response.razorpay_payment_id}`);
            console.log(`- verification result: ${verifyRes && verifyRes.success ? "SUCCESS" : "FAILED"}`);

            if (verifyRes && verifyRes.success) {
              resolveVerify(true);
            } else {
              resolveVerify(false);
            }
          },
          prefill: {
            name: userProfile.name || "",
            contact: userProfile.phone || "",
          },
          theme: {
            color: "#ff8b66",
          },
          modal: {
            ondismiss: function () {
              console.log("[PlansContext] Razorpay Checkout dismissed by user.");
              // Required Logging on failure/dismiss:
              console.log(`[Razorpay Payment Audit]`);
              console.log(`- plan id: ${planId}`);
              console.log(`- participant id: ${existingBefore?.id || "new_participant"}`);
              console.log(`- order id: ${order.id}`);
              console.log(`- payment id: N/A (dismissed)`);
              console.log(`- verification result: CANCELLED`);
              resolveVerify(false);
            }
          }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      });

      if (!isVerified) {
        console.warn("[PlansContext] Razorpay payment could not be verified. Aborting accept transition.");
        return;
      }

      // 5. Update participant on success: status = going, payment_status = paid
      if (planUuid && userUuid) {
        if (existingBefore && existingBefore.id) {
          await updateParticipantStatus(existingBefore.id, "going", "paid");
        } else {
          await insertParticipant({
            plan_id: planUuid,
            user_id: userUuid,
            status: "going",
            payment_status: "paid",
            joined_at: new Date().toISOString()
          });
        }
        await syncUserStats(userUuid, "join_plan");

        // 6. Create completed transaction record with duplicate check
        try {
          const freshRes = await fetch("/api/db/fetch-all");
          if (freshRes.ok) {
            const freshJson = await freshRes.json();
            const existingTransactions = freshJson?.data?.transactions || [];
            const isDuplicate = existingTransactions.some((tx: any) => tx.plan_id === planUuid && tx.sender_id === userUuid);

            if (!isDuplicate) {
              const hostUuid = matchedPlan.creatorId || matchedPlan.hostId;
              const newTx = {
                transaction_id: `T_${Date.now()}`,
                sender_id: userUuid,
                receiver_id: hostUuid,
                plan_id: planUuid,
                amount: matchedPlan.cost,
                transaction_type: "plan_payment",
                status: "completed",
                created_at: new Date().toISOString()
              };

              console.log(`[Transaction Insert Audit]`);
              console.log(`- transaction id: ${newTx.transaction_id}`);
              console.log(`- sender_id: ${newTx.sender_id}`);
              console.log(`- receiver_id: ${newTx.receiver_id}`);
              console.log(`- plan_id: ${newTx.plan_id}`);
              console.log(`- amount: ${newTx.amount}`);

              await insertTransaction(newTx);
            } else {
              console.warn(`[PlansContext] Duplicate transaction detected for plan_id=${planUuid} and sender_id=${userUuid}. Skipping insert.`);
            }
          }
        } catch (txErr: any) {
          console.error("[PlansContext] Failed to persist transaction record:", txErr);
        }
      }
      await refreshPlans(["plan_participants", "user_stats", "transactions"]);
      return;
    }

    // 2. Database Persistence
    if (planUuid && userUuid) {
      if (existingBefore && (existingBefore.status === "host" || isHost)) {
        console.log(`[PlansContext] User is host. Skipping database participant status overwrite.`);
        return;
      }

      const acceptedCount = dbPlanParticipants.filter(
        pp => (pp.plan_id === planUuid || pp.plan_id === planId) &&
              (pp.status === "going" || pp.status === "host")
      ).length;
      
      // joinLimit = total going capacity (host-inclusive). Full when acceptedCount >= limit.
      const limit = matchedPlan?.joinLimit || 0;
      const targetDbState = (matchedPlan?.waitlistEnabled && acceptedCount >= limit) ? "waitlist" : "going";

      console.log(`[PlansContext DB Write Audit]`);
      console.log(`- joinLimit: ${limit}`);
      console.log(`- active participant count: ${acceptedCount}`);
      console.log(`- participant status before accept: ${existingBefore?.status || "none"}`);
      console.log(`- participant status after accept: ${targetDbState}`);
      console.log(`- waitlist decision result: ${targetDbState}`);

      if (existingBefore && existingBefore.id) {
        await updateParticipantStatus(existingBefore.id, targetDbState, targetDbState === "going" && matchedPlan && matchedPlan.cost > 0 ? "paid" : "unpaid");
      } else {
        await insertParticipant({
          plan_id: planUuid,
          user_id: userUuid,
          status: targetDbState,
          payment_status: targetDbState === "going" && matchedPlan && matchedPlan.cost > 0 ? "paid" : "unpaid",
          joined_at: new Date().toISOString()
        });
      }
      await syncUserStats(userUuid, "join_plan");
    }

    // 3. Sync state from DB
    await refreshPlans(["plan_participants", "user_stats"]);

    // Logging: status after action
    const refSnapshot = await fetch("/api/db/fetch-all").then(r => r.json()).catch(() => null);
    const existingAfter = refSnapshot?.data?.plan_participants?.find((p: any) => p.plan_id === planUuid && p.user_id === userUuid);
    console.log(`[PlansContext] Participant status AFTER action & DB refresh:`, existingAfter ? existingAfter.status : "none");
  };

  const waitlistPlan = async (planId: string, userProfile: any) => {
    const matchedPlan = plans.find(p => p.id === planId);
    const planUuid = matchedPlan?.dbUuid || planId;
    const userUuid = userProfile.dbUuid || resolveUserUuid(userProfile.user_id || userId);

    if (!userUuid || !isUuid(userUuid)) {
      console.error(`[PlansContext] Cannot waitlist plan: user UUID is missing or invalid:`, userUuid);
      return;
    }

    const existingBefore = dbPlanParticipants.find(p => (p.plan_id === planUuid || p.plan_id === planId) && (p.user_id === userUuid || p.user_id === userProfile.user_id));
    console.log(`[PlansContext] WAITLIST ACTION START for Plan: ${matchedPlan?.title || planId}, User: ${userProfile.name}`);
    console.log(`[PlansContext] Participant status BEFORE action:`, existingBefore ? existingBefore.status : "none");

    // 2. Database Persistence
    if (planUuid && userUuid) {
      if (existingBefore && existingBefore.id) {
        await updateParticipantStatus(existingBefore.id, "waitlist", "unpaid");
      } else {
        await insertParticipant({
          plan_id: planUuid,
          user_id: userUuid,
          status: "waitlist",
          payment_status: "unpaid",
          joined_at: new Date().toISOString()
        });
      }
    }

    // 3. Sync state from DB
    await refreshPlans(["plan_participants"]);

    // Logging: status after action
    const refSnapshot = await fetch("/api/db/fetch-all").then(r => r.json()).catch(() => null);
    const existingAfter = refSnapshot?.data?.plan_participants?.find((p: any) => p.plan_id === planUuid && p.user_id === userUuid);
    console.log(`[PlansContext] Participant status AFTER action & DB refresh:`, existingAfter ? existingAfter.status : "none");
  };

  const leavePlan = async (planId: string, leaverId: string) => {
    const matchedPlan = plans.find(p => p.id === planId);
    const planUuid = matchedPlan?.dbUuid || planId;
    const userUuid = resolveUserUuid(leaverId);

    if (!userUuid || !isUuid(userUuid)) {
      console.error(`[PlansContext] Cannot leave plan: user UUID is missing or invalid:`, userUuid);
      throw new Error("Invalid user UUID");
    }

    const existingBefore = dbPlanParticipants.find(p => (p.plan_id === planUuid || p.plan_id === planId) && (p.user_id === userUuid || p.user_id === leaverId));
    console.log(`[PlansContext] LEAVE ACTION START for Plan: ${matchedPlan?.title || planId}, User: ${leaverId}`);
    console.log(`[PlansContext] Participant status BEFORE action:`, existingBefore ? existingBefore.status : "none");

    // 2. Database Persistence - update status to 'skipped' instead of deleting
    if (existingBefore && existingBefore.id) {
      try {
        await updateParticipantStatus(existingBefore.id, "skipped", existingBefore.payment_status);
        console.log(`[leavePlan] Updated participant row ${existingBefore.id} status to 'skipped'`);
      } catch (err) {
        console.error(`[PlansContext] leavePlan DB write failed:`, err);
        throw err;
      }
    } else {
      throw new Error("Participant record not found");
    }

    // 3. Sync state from DB
    await refreshPlans(["plan_participants"]);

    // Logging: status after action
    const refSnapshot = await fetch("/api/db/fetch-all").then(r => r.json()).catch(() => null);
    const existingAfter = refSnapshot?.data?.plan_participants?.find((p: any) => p.plan_id === planUuid && p.user_id === userUuid);
    console.log(`[PlansContext] Participant status AFTER action & DB refresh:`, existingAfter ? existingAfter.status : "none");
  };

  const passPlan = async (planId: string, passerId: string) => {
    const matchedPlan = plans.find(p => p.id === planId);
    const planUuid = matchedPlan?.dbUuid || planId;
    const userUuid = resolveUserUuid(passerId);

    if (!userUuid || !isUuid(userUuid)) {
      console.error(`[PlansContext] Cannot pass plan: user UUID is missing or invalid:`, userUuid);
      return;
    }

    const existingBefore = dbPlanParticipants.find(p => (p.plan_id === planUuid || p.plan_id === planId) && (p.user_id === userUuid || p.user_id === passerId));
    console.log(`[PlansContext] PASS ACTION START for Plan: ${matchedPlan?.title || planId}, User: ${passerId}`);
    console.log(`[PlansContext] Participant status BEFORE action:`, existingBefore ? existingBefore.status : "none");

    // 2. Database Persistence
    if (planUuid && userUuid) {
      if (existingBefore && existingBefore.id) {
        await updateParticipantStatus(existingBefore.id, "passed", "unpaid");
      } else {
        await insertParticipant({
          plan_id: planUuid,
          user_id: userUuid,
          status: "passed",
          payment_status: "unpaid",
          joined_at: new Date().toISOString()
        });
      }
    }

    // 3. Sync state from DB
    await refreshPlans(["plan_participants"]);

    // Logging: status after action
    const refSnapshot = await fetch("/api/db/fetch-all").then(r => r.json()).catch(() => null);
    const existingAfter = refSnapshot?.data?.plan_participants?.find((p: any) => p.plan_id === planUuid && p.user_id === userUuid);
    console.log(`[PlansContext] Participant status AFTER action & DB refresh:`, existingAfter ? existingAfter.status : "none");
  };

  const markPlanSeen = async (planId: string, userId: string) => {
    const matchedPlan = plans.find(p => p.id === planId);
    const planUuid = matchedPlan?.dbUuid || planId;
    const userUuid = resolveUserUuid(userId);

    if (!userUuid || !isUuid(userUuid)) {
      console.error(`[PlansContext] Cannot mark plan seen: user UUID is missing or invalid:`, userUuid);
      return;
    }

    const existingBefore = dbPlanParticipants.find(
      p => (p.plan_id === planUuid || p.plan_id === planId) && (p.user_id === userUuid || p.user_id === userId)
    );

    if (!existingBefore) {
      console.log(`[PlansContext] markPlanSeen: No participant record found for plan ${planId} / user ${userId}`);
      return;
    }

    if (existingBefore.status !== "delivered") {
      return;
    }

    console.log(`[PlansContext] MARK SEEN ACTION START for Plan: ${matchedPlan?.title || planId}, User: ${userId}`);

    if (existingBefore.id) {
      await updateParticipantStatus(existingBefore.id, "seen", existingBefore.payment_status);
      console.log(`[PlansContext] markPlanSeen: Updated DB status of participant row ${existingBefore.id} to 'seen'`);
    }

    await refreshPlans(["plan_participants"]);
  };

  const skipPlan = async (planId: string, userId: string) => {
    console.log(`[DetailedPlanModal] SKIP_CLICKED: for Plan: ${planId}, User: ${userId}`);
    const matchedPlan = plans.find(p => p.id === planId);
    const planUuid = matchedPlan?.dbUuid || planId;
    const userUuid = resolveUserUuid(userId);

    if (!userUuid || !isUuid(userUuid)) {
      console.error(`[PlansContext] Cannot skip plan: user UUID is missing or invalid:`, userUuid);
      console.log(`[DetailedPlanModal] SKIP_DB_UPDATE_FAILED: invalid userUuid`);
      return;
    }

    const existingBefore = dbPlanParticipants.find(
      p => (p.plan_id === planUuid || p.plan_id === planId) && (p.user_id === userUuid || p.user_id === userId)
    );

    if (!existingBefore) {
      console.log(`[PlansContext] skipPlan: No participant record found for plan ${planId} / user ${userId}`);
      console.log(`[DetailedPlanModal] SKIP_DB_UPDATE_FAILED: participant record missing`);
      return;
    }

    const isHost = matchedPlan?.hostId === "u_self" || matchedPlan?.creatorId === userUuid || matchedPlan?.creatorId === "u_self";
    if (existingBefore.status === "host" || isHost) {
      console.log(`[PlansContext] User is host. Skip transition aborted.`);
      console.log(`[DetailedPlanModal] SKIP_DB_UPDATE_FAILED: user is host`);
      return;
    }

    const skippableStatuses = ["delivered", "seen", "waitlist", "new", "going"];
    if (!skippableStatuses.includes(existingBefore.status)) {
      console.log(`[PlansContext] skipPlan: Status is '${existingBefore.status}', which is not skippable. Aborting skip.`);
      console.log(`[DetailedPlanModal] SKIP_DB_UPDATE_FAILED: status is not skippable`);
      return;
    }

    console.log(`[PlansContext] SKIP ACTION START for Plan: ${matchedPlan?.title || planId}, User: ${userId}`);

    try {
      if (existingBefore.id) {
        const result = await updateParticipantStatus(existingBefore.id, "skipped", existingBefore.payment_status);
        if (result && normalizeStatus(result.status) === "skipped") {
          console.log(`[DetailedPlanModal] SKIP_DB_UPDATE_SUCCESS: status updated to skipped`);
        } else {
          throw new Error("Update returned invalid row or status wasn't skipped");
        }
      } else {
        throw new Error("Participant ID is missing");
      }

      console.log(`[DetailedPlanModal] SKIP_STATE_UPDATED: database updated successfully`);
      await refreshPlans(["plan_participants"]);
    } catch (error) {
      console.error(`[PlansContext] skipPlan DB write failed:`, error);
      console.log(`[DetailedPlanModal] SKIP_DB_UPDATE_FAILED: database exception`);
      throw error;
    }
  };

  const rejoinPlan = async (planId: string, userProfile: any) => {
    const matchedPlan = plans.find(p => p.id === planId);
    const planUuid = matchedPlan?.dbUuid || planId;
    const userUuid = userProfile.dbUuid || resolveUserUuid(userProfile.user_id || userId);

    if (!userUuid || !isUuid(userUuid)) {
      console.error(`[PlansContext] Cannot rejoin plan: user UUID is missing or invalid:`, userUuid);
      return;
    }

    const existingBefore = dbPlanParticipants.find(
      p => (p.plan_id === planUuid || p.plan_id === planId) && (p.user_id === userUuid || p.user_id === userProfile.user_id)
    );

    if (!existingBefore) {
      console.log(`[PlansContext] rejoinPlan: No participant record found for plan ${planId}`);
      return;
    }

    const isHost = matchedPlan?.hostId === "u_self" || matchedPlan?.creatorId === userUuid || matchedPlan?.creatorId === "u_self";
    if (existingBefore.status === "host" || isHost) {
      console.log(`[PlansContext] User is host. Rejoin transition aborted.`);
      return;
    }

    if (existingBefore.status !== "skipped" && existingBefore.status !== "passed") {
      console.log(`[PlansContext] rejoinPlan: Status is '${existingBefore.status}', not 'skipped' or 'passed'. Aborting rejoin.`);
      return;
    }

    console.log(`[PlansContext] REJOIN ACTION START (skipped -> seen) for Plan: ${matchedPlan?.title || planId}, User: ${userProfile.name}`);

    if (existingBefore.id) {
      // 1. Transition skipped -> seen
      await updateParticipantStatus(existingBefore.id, "seen", existingBefore.payment_status);
      console.log(`[PlansContext] rejoinPlan: Transitioned row ${existingBefore.id} from 'skipped' to 'seen'`);

      // 2. Use existing attendance routing logic
      const acceptedCount = dbPlanParticipants.filter(
        pp => (pp.plan_id === planUuid || pp.plan_id === planId) &&
              (pp.status === "going" || pp.status === "host")
      ).length;
      
      const limit = matchedPlan?.joinLimit || 0;
      const targetDbState = (matchedPlan?.waitlistEnabled && acceptedCount >= limit) ? "waitlist" : "going";

      console.log(`[PlansContext] rejoinPlan routing: decided status is '${targetDbState}' (limit: ${limit}, accepted: ${acceptedCount})`);

      // 3. Update existing participant row to target status
      await updateParticipantStatus(
        existingBefore.id,
        targetDbState,
        targetDbState === "going" && matchedPlan && matchedPlan.cost > 0 ? "paid" : "unpaid"
      );
      
      await syncUserStats(userUuid, "join_plan");
    }

    await refreshPlans(["plan_participants", "user_stats"]);
  };

  const changePlanHost = async (planId: string, newHostUuid: string, oldHostUuid: string) => {
    console.log(`[changePlanHost] Payload before database write:`, { planId, newHostUuid, oldHostUuid });

    const matchedPlan = plans.find(p => p.id === planId || p.dbUuid === planId);
    const planUuid = matchedPlan?.dbUuid || planId;

    const resolvedNewHostUuid = resolveUserUuid(newHostUuid);
    const resolvedOldHostUuid = resolveUserUuid(oldHostUuid);

    console.log(`[changePlanHost] Payload after mapper/sync transformation:`, { planUuid, resolvedNewHostUuid, resolvedOldHostUuid });

    if (!isUuid(resolvedNewHostUuid) || !isUuid(resolvedOldHostUuid)) {
      console.error("[PlansContext] changePlanHost: invalid UUID detected");
      throw new Error("Invalid host UUID");
    }

    const planUpdate = {
      id: planUuid,
      host_id: resolvedNewHostUuid
    };

    const oldHostPp = dbPlanParticipants.find(pp => pp.plan_id === planUuid && pp.user_id === resolvedOldHostUuid);
    const newHostPp = dbPlanParticipants.find(pp => pp.plan_id === planUuid && pp.user_id === resolvedNewHostUuid);

    console.log(`- oldHostPp:`, oldHostPp);
    console.log(`- newHostPp:`, newHostPp);

    const participantUpdates = [];
    if (oldHostPp) {
      participantUpdates.push({
        id: oldHostPp.id,
        status: "going"
      });
    }

    if (newHostPp) {
      participantUpdates.push({
        id: newHostPp.id,
        status: "going"
      });
    } else {
      console.log(`- inserting new host participant record`);
      const recordToInsert = {
        plan_id: planUuid,
        user_id: resolvedNewHostUuid,
        status: "going",
        payment_status: "unpaid",
        joined_at: new Date().toISOString()
      };
      console.log(`[changePlanHost] Final Supabase query payload (insert participant):`, { table: "plan_participants", records: [recordToInsert] });
      const insertRes = await fetch("/api/db/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: "plan_participants",
          records: [recordToInsert]
        })
      });
      if (!insertRes.ok) {
        throw new Error("Failed to insert new host participant record in database");
      }
    }

    console.log(`[changePlanHost] Final Supabase query payload (update plan):`, { table: "plans", records: [planUpdate] });
    // Update plans table
    const plansRes = await fetch("/api/db/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "plans", records: [planUpdate] })
    });
    if (!plansRes.ok) {
      throw new Error("Failed to update plan host_id in database");
    }

    // Update participant statuses
    if (participantUpdates.length > 0) {
      console.log(`[changePlanHost] Final Supabase query payload (update participant statuses):`, { table: "plan_participants", records: participantUpdates });
      const ppRes = await fetch("/api/db/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "plan_participants", records: participantUpdates })
      });
      if (!ppRes.ok) {
        throw new Error("Failed to update participant statuses in database");
      }
    }

    console.log(`[PlansContext] CHANGE HOST SUCCESS. Refreshing plans state.`);
    await refreshPlans(["plans", "plan_participants"]);
  };

  const cancelPlan = async (planId: string) => {
    console.log(`[cancelPlan] Payload before database write:`, { planId });

    const matchedPlan = plans.find(p => p.id === planId || p.dbUuid === planId);
    const planUuid = matchedPlan?.dbUuid || planId;

    console.log(`[cancelPlan] Payload after mapper/sync transformation:`, { planUuid });

    const planUpdate = {
      id: planUuid,
      status: "cancelled"
    };

    console.log(`[cancelPlan] Final Supabase query payload (cancel plan):`, { table: "plans", records: [planUpdate] });

    const res = await fetch("/api/db/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "plans", records: [planUpdate] })
    });
    if (!res.ok) {
      throw new Error("Failed to cancel plan in database");
    }

    console.log(`[PlansContext] CANCEL PLAN SUCCESS. Refreshing plans state.`);
    await refreshPlans(["plans"]);
  };

  // Reminder System
  const sendReminder = (planId: string, targetUserId: string) => {
    setPlans(prevPlans => prevPlans.map(plan => {
      if (plan.id === planId) {
        const newMembersList = plan.members.map(u =>
          u.userId === targetUserId ? { ...u, reminderState: "sent" as const } : u
        );
        return {
          ...plan,
          members: newMembersList,
          joinedUsers: newMembersList.filter(m => m.joinState !== "passed")
        };
      }
      return plan;
    }));

    // Database Persistence
    const matchedPlan = plans.find(p => p.id === planId);
    const planUuid = matchedPlan?.dbUuid;
    const senderUuid = resolveUserUuid(userId);

    if (planUuid && senderUuid) {
      insertPlanReminder({
        plan_id: planUuid,
        sent_by: senderUuid
      });
    }
  };

  const ignoreReminder = (planId: string, ignoreUserId: string) => {
    passPlan(planId, ignoreUserId);
  };

  // ─── Accept Plan ──────────────────────────────────────────────────────────
  // Participant accepts the plan invitation. After all non-host participants
  // accept, the plan's acceptance_status transitions to "confirmed" so the
  // host sees a Pay Now button.
  const acceptPlan = async (planId: string, userProfile: any) => {
    const matchedPlan = plans.find((p) => p.id === planId);
    const planUuid = matchedPlan?.dbUuid || planId;
    const userUuid = userProfile.dbUuid || resolveUserUuid(userProfile.user_id || userId);

    if (!userUuid || !isUuid(userUuid)) {
      console.error(`[PlansContext] acceptPlan: invalid UUID`, userUuid);
      return;
    }

    // 1. Resolve capacity decision
    const acceptedCount = dbPlanParticipants.filter(
      pp => (pp.plan_id === planUuid || pp.plan_id === planId) &&
            (pp.status === "going" || pp.status === "host")
    ).length;
    const limit = matchedPlan?.joinLimit || 0;
    const targetDbState = (matchedPlan?.waitlistEnabled && acceptedCount >= limit) ? "waitlist" : "going";

    const existing = dbPlanParticipants.find(
      (p) => (p.plan_id === planUuid || p.plan_id === planId) && p.user_id === userUuid
    );

    if (existing && existing.id) {
      await updateParticipantStatus(existing.id, targetDbState, targetDbState === "going" && matchedPlan && matchedPlan.cost > 0 ? "paid" : "unpaid");
    } else {
      await insertParticipant({
        plan_id: planUuid,
        user_id: userUuid,
        status: targetDbState,
        payment_status: targetDbState === "going" && matchedPlan && matchedPlan.cost > 0 ? "paid" : "unpaid",
        joined_at: new Date().toISOString(),
      });
    }

    console.log(`[acceptPlan] User ${userUuid} joined plan ${planUuid} with status ${targetDbState}`);

    // 2. Refresh and check if all non-host participants have accepted
    await refreshPlans(["plan_participants", "plans"]);

    const freshRes = await fetch("/api/db/fetch-all");
    const freshJson = await freshRes.json();
    const freshParticipants = freshJson?.data?.plan_participants || [];
    const planParticipants = freshParticipants.filter(
      (pp: any) => pp.plan_id === planUuid
    );
    const dbPlanObj = dbPlans.find(dp => dp.id === planUuid || dp.plan_id === planId);
    const hostUuid = matchedPlan?.creatorId || dbPlanObj?.host_id || dbPlanObj?.created_by;
    const nonHostParticipants = planParticipants.filter(
      (pp: any) => pp.user_id !== hostUuid
    );
    const allAccepted =
      nonHostParticipants.length > 0 &&
      nonHostParticipants.every((pp: any) => {
        const norm = normalizeStatus(pp.status);
        return norm === "going" || norm === "waitlist";
      });

    console.log(
      `[acceptPlan] Non-host participants: ${nonHostParticipants.length}, all accepted: ${allAccepted}`
    );

    if (allAccepted) {
      // 3. Transition plan → confirmed
      await fetch("/api/db/update-plan-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planUuid, acceptance_status: "confirmed" }),
      });
      console.log(`[acceptPlan] Plan ${planUuid} is now CONFIRMED — host can pay!`);
      await refreshPlans(["plans"]);
    }

    // Check sports threshold transition
    if (matchedPlan && (matchedPlan.category === "sports" || (matchedPlan as any).sports_type || (matchedPlan as any).venue_id)) {
      const confirmedParticipants = planParticipants.filter(
        (pp: any) => {
          const norm = normalizeStatus(pp.status);
          return norm === "going";
        }
      );
      const confirmedCount = confirmedParticipants.length;
      const required = (matchedPlan as any).required_confirmations || matchedPlan.min_participants || 0;
      console.log(`[acceptPlan] Sports Plan threshold check: ${confirmedCount}/${required}`);
      if (confirmedCount >= required) {
        await fetch("/api/db/upsert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            table: "plans",
            records: [{ id: planUuid, status: "BOOKING_READY" }]
          })
        });
        console.log(`[acceptPlan] Sports Plan ${planUuid} -> BOOKING_READY`);
        await refreshPlans(["plans"]);
      }
    }
  };

  // ─── Decline Plan (Skip Plan) ──────────────────────────────────────────────
  const declinePlan = async (planId: string, userProfile: any) => {
    const matchedPlan = plans.find((p) => p.id === planId);
    const planUuid = matchedPlan?.dbUuid || planId;
    const userUuid = userProfile.dbUuid || resolveUserUuid(userProfile.user_id || userId);

    if (!userUuid || !isUuid(userUuid)) {
      console.error(`[PlansContext] declinePlan: invalid UUID`, userUuid);
      return;
    }

    const existing = dbPlanParticipants.find(
      (p) => (p.plan_id === planUuid || p.plan_id === planId) && p.user_id === userUuid
    );
    if (existing && existing.id) {
      await updateParticipantStatus(existing.id, "skipped", "unpaid");
    }

    await refreshPlans(["plan_participants"]);
  };

  // ─── Host Pay ─────────────────────────────────────────────────────────────
  // Only callable after plan acceptance_status === "confirmed".
  // Calls the /api/db/host-pay endpoint which creates split transactions.
  const hostPay = async (planId: string, hostProfile: any): Promise<boolean> => {
    const matchedPlan = plans.find((p) => p.id === planId);
    const planUuid = matchedPlan?.dbUuid || planId;
    const hostUuid = hostProfile.dbUuid || resolveUserUuid(hostProfile.user_id || userId);
    const costPerPerson = matchedPlan?.cost || matchedPlan?.paymentAmount || 0;

    if (!hostUuid || !isUuid(hostUuid)) {
      console.error(`[PlansContext] hostPay: invalid host UUID`, hostUuid);
      return false;
    }

    console.log(`[hostPay] Processing payment for plan ${planUuid}, ₹${costPerPerson}/person`);

    const res = await fetch("/api/db/host-pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan_id: planUuid,
        host_user_id: hostUuid,
        cost_per_person: costPerPerson,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error(`[hostPay] Failed:`, err);
      return false;
    }

    const result = await res.json();
    console.log(`[hostPay] Success! Total: ₹${result.total_cost}, split: ${result.split_count} people`);
    await refreshPlans(["plan_participants", "plans", "transactions"]);
    return true;
  };

  const bookNow = async (planId: string, hostProfile: any): Promise<{ success: boolean; status?: string; error?: string }> => {
    const matchedPlan = plans.find((p) => p.id === planId);
    const planUuid = matchedPlan?.dbUuid || planId;
    const hostUuid = hostProfile.dbUuid || resolveUserUuid(hostProfile.user_id || userId);

    if (!hostUuid || !isUuid(hostUuid)) {
      console.error(`[PlansContext] bookNow: invalid host UUID`, hostUuid);
      return { success: false, error: "Invalid host UUID" };
    }

    try {
      const res = await fetch("/api/db/book-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: planUuid,
          host_user_id: hostUuid,
        }),
      });

      const data = await res.json();
      await refreshPlans(["plans", "transactions", "users"]);
      return data;
    } catch (err: any) {
      console.error("[PlansContext] bookNow exception:", err);
      return { success: false, error: err.message || "Failed to book" };
    }
  };

  /**
   * Returns DB-accurate participant counts for a plan.
   * planUuid can be either the UUID id or the short plan_id —
   * we match against both to handle legacy data.
   */
  const getParticipantCounts = (planUuid: string): ParticipantCounts => {
    const rows = dbPlanParticipants.filter(
      pp => pp.plan_id === planUuid || (pp as any).id === planUuid
    );

    const plan = dbPlans.find(p => p.id === planUuid || p.plan_id === planUuid);
    const hostUuid = plan?.host_id || plan?.created_by;

    const breakdown = calculateParticipantBreakdown(rows);
    const { waitlist, delivered, seen, skipped, passed, pending, total } = breakdown;

    const host = rows.some(r => r.user_id === hostUuid && normalizeStatus(r.status) === "going") ? 1 : 0;
    const going = rows.filter(r => normalizeStatus(r.status) === "going" && r.user_id !== hostUuid).length;

    const joinedCountVal = host + going;
    console.log(`[getParticipantCounts] PlanUuid: ${planUuid}`);
    console.log(`[getParticipantCounts] DB raw participants count: ${rows.length}`);
    console.log(`[getParticipantCounts] breakdown - host: ${host}, going: ${going}, waitlist: ${waitlist}, delivered: ${delivered}, seen: ${seen}, skipped: ${skipped}, pending: ${pending}`);
    console.log(`[getParticipantCounts] Joined count calculation (host + going): ${joinedCountVal}`);

    return { host, going, waitlist, delivered, seen, skipped, passed, pending, total };
  };

  const getHomeFeedPlans = (userIdStr: string) => {
    const userUuid = resolveUserUuid(userIdStr);
    const myParticipantRecords = dbPlanParticipants.filter(pp => pp.user_id === userUuid);
    const filtered = plans.filter(plan => {
      if (plan.status === "cancelled") return false;
      const planUuid = plan.dbUuid || plan.id;
      const ppRecord = myParticipantRecords.find(pp => pp.plan_id === planUuid);
      const isIncluded = ppRecord && ["delivered", "seen", "new", "waitlist"].includes(ppRecord.status);
      if (!isIncluded) return false;

      if (plan.response_deadline_at) {
        const deadline = new Date(plan.response_deadline_at).getTime();
        const now = new Date().getTime();
        if (now > deadline) {
          return false;
        }
      }

      return true;
    });

    console.log(`[PlansContext getHomeFeedPlans] Current User: ${userId}, Visible Count: ${filtered.length}, Plans:`, filtered.map(p => p.title));

    const getTimelineSectionValue = (p: Plan) => {
      const dt = p.date.toUpperCase();
      if (dt.includes("TODAY")) return 1;
      if (dt.includes("TOMORROW")) return 2;
      return 3;
    };

    const getDayIndexValue = (dateStr: string) => {
      const d = dateStr.toUpperCase();
      if (d.includes("MON")) return 1;
      if (d.includes("TUE")) return 2;
      if (d.includes("WED")) return 3;
      if (d.includes("THU")) return 4;
      if (d.includes("FRI")) return 5;
      if (d.includes("SAT")) return 6;
      if (d.includes("SUN")) return 7;
      return 8;
    };



    return filtered.sort((a, b) => {
      const secA = getTimelineSectionValue(a);
      const secB = getTimelineSectionValue(b);
      if (secA !== secB) return secA - secB;

      const dayA = getDayIndexValue(a.date);
      const dayB = getDayIndexValue(b.date);
      if (dayA !== dayB) return dayA - dayB;

      return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
    });
  };

  const getHubPlans = (userIdStr: string) => {
    // Show all plans where user is a participant (host or going) — for the Plans hub tab
    return plans.filter(plan => {
      if (plan.status === "cancelled") return false;
      if (plan.hostId === "u_self") return true; // hosted by logged-in user
      const member = plan.members.find(
         m => m.userId === userIdStr || (m as any).userUuid === userIdStr
      );
      return member?.joinState === "going" || member?.joinState === "host";
    });
  };

  return (
    <PlansContext.Provider value={{ 
      plans, setPlans, 
      dbPlans, setDbPlans, 
      dbPlanParticipants, setDbPlanParticipants,
      dbMemories, setDbMemories,
      joinPlan, leavePlan, passPlan, waitlistPlan, sendReminder, ignoreReminder, getHomeFeedPlans, getHubPlans, getParticipantCounts, refreshPlans, markPlanSeen, skipPlan, rejoinPlan,
      acceptPlan, declinePlan, hostPay, bookNow, changePlanHost, cancelPlan
    }}>
      {children}
    </PlansContext.Provider>
  );
};

export const usePlansStore = () => {
  const context = useContext(PlansContext);
  if (context === undefined) {
    throw new Error("usePlansStore must be used within a PlansProvider");
  }
  return context;
};

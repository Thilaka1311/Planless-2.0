import React, { createContext, useContext, useState, ReactNode } from "react";
import { Plan, PlanMember, DbPlan, DbPlanParticipant, DbMemory, User } from "../../../core/types";
import { useProfileStore } from "../../profile/state/ProfileContext";
import { useCirclesStore } from "../../circles/state/CirclesContext";
import { insertParticipant, updateParticipantStatus, insertPlanReminder, syncUserStats, createRazorpayOrder, verifyRazorpayPayment, insertTransaction } from "../../../lib/db";
import { mapPlansToLegacyPlans } from "../../../lib/mappers";

interface ParticipantCounts {
  host: number;
  going: number;
  waitlist: number;
  delivered: number;
  seen: number;
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
  refreshPlans: () => Promise<void>;
  // New acceptance / payment / booking actions
  acceptPlan: (planId: string, userProfile: any) => Promise<void>;
  declinePlan: (planId: string, userProfile: any) => Promise<void>;
  hostPay: (planId: string, hostProfile: any) => Promise<boolean>;
  bookNow: (planId: string, hostProfile: any) => Promise<{ success: boolean; status?: string; error?: string }>;
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

  const refreshPlans = async () => {
    try {
      const res = await fetch("/api/db/fetch-all");
      if (res.ok) {
        const json = await res.json();
        if (json.configured && !json.tables_missing) {
          const d = json.data || {};
          setDbPlans(d.plans || []);
          setDbPlanParticipants(d.plan_participants || []);
          setDbMemories(d.memories || []);
          setPlans(mapPlansToLegacyPlans(d.plans || [], d.plan_participants || [], d.users || [], userId, d.circles || []));
          console.log(`[PlansContext refreshPlans] Successfully refreshed plans state. Count: ${d.plans?.length}, Participants: ${d.plan_participants?.length}`);
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

    const isHost = existingBefore?.status === "host" || matchedPlan?.creatorId === userUuid || matchedPlan?.creatorId === "u_self";
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
      await refreshPlans();
      return;
    }

    // 1. Update UI plans state locally for immediate response
    setPlans(prevPlans => prevPlans.map(plan => {
      if (plan.id === planId) {
        const alreadyJoined = plan.members.some(u => u.userId === userProfile.user_id && (u.joinState === "going" || u.joinState === "host"));
        if (alreadyJoined) {
          console.log(`[PlansContext] User already joined or host. Skipping local UI update.`);
          return plan;
        }

        const activeMembersCount = plan.members.filter(u => u.joinState === "going" || u.joinState === "host").length;
        const targetJoinState = (plan.waitlistEnabled && activeMembersCount > (plan.joinLimit || 0)) ? "waitlist" : "going";

        console.log(`[PlansContext Local UI Update]`);
        console.log(`- Plan title: "${plan.title}"`);
        console.log(`- waitlistEnabled: ${plan.waitlistEnabled}`);
        console.log(`- joinLimit: ${plan.joinLimit}`);
        console.log(`- active participant count (host + going): ${activeMembersCount}`);
        console.log(`- waitlist decision result: ${targetJoinState}`);

        const newMember: PlanMember = {
          userId: userProfile.user_id || userId,
          name: userProfile.name,
          avatar: userProfile.avatar,
          joinState: targetJoinState,
          reminderState: "none",
          joinedAt: new Date().toISOString(),
          checkedIn: targetJoinState === "going" && matchedPlan && matchedPlan.cost > 0
        };

        const newMembersList = [...plan.members.filter(m => m.userId !== newMember.userId), newMember];
        const newJoinedCount = newMembersList.filter(m => m.joinState === "going" || m.joinState === "host").length;
        const currentCapacity = plan.waitlistEnabled && plan.joinLimit ? plan.joinLimit : (plan.capacity || 10);
        const progressPct = currentCapacity > 0 ? Math.round((newJoinedCount / currentCapacity) * 100) : 0;

        return {
          ...plan,
          members: newMembersList,
          joinedUsers: newMembersList,
          confirmedCount: newJoinedCount
        };
      }
      return plan;
    }));

    // 2. Database Persistence
    if (planUuid && userUuid) {
      if (existingBefore && existingBefore.status === "host") {
        console.log(`[PlansContext] User is host. Skipping database participant status overwrite.`);
        return;
      }

      const acceptedCount = dbPlanParticipants.filter(
        pp => (pp.plan_id === planUuid || pp.plan_id === planId) &&
              (pp.status === "going" || pp.status === "host")
      ).length;
      
      // If activeParticipants <= joinLimit, status is "going", else "waitlist"
      const limit = matchedPlan?.joinLimit || 0;
      const targetDbState = (matchedPlan?.waitlistEnabled && acceptedCount > limit) ? "waitlist" : "going";

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
    await refreshPlans();

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

    // 1. Update UI plans state locally
    setPlans(prevPlans => prevPlans.map(plan => {
      if (plan.id === planId) {
        const alreadyWaitlisted = plan.members.some(u => u.userId === userProfile.user_id && u.joinState === "waitlist");
        if (alreadyWaitlisted) return plan;

        const newMember: PlanMember = {
          userId: userProfile.user_id || userId,
          name: userProfile.name,
          avatar: userProfile.avatar,
          joinState: "waitlist",
          reminderState: "none",
          joinedAt: new Date().toISOString()
        };

        const newMembersList = [...plan.members.filter(m => m.userId !== newMember.userId), newMember];

        return {
          ...plan,
          members: newMembersList,
          joinedUsers: newMembersList,
          waitlistUsers: newMembersList.filter(m => m.joinState === "waitlist")
        };
      }
      return plan;
    }));

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
    await refreshPlans();

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
      return;
    }

    const existingBefore = dbPlanParticipants.find(p => (p.plan_id === planUuid || p.plan_id === planId) && (p.user_id === userUuid || p.user_id === leaverId));
    console.log(`[PlansContext] LEAVE ACTION START for Plan: ${matchedPlan?.title || planId}, User: ${leaverId}`);
    console.log(`[PlansContext] Participant status BEFORE action:`, existingBefore ? existingBefore.status : "none");

    // 1. Update UI plans state locally
    setPlans(prevPlans => prevPlans.map(plan => {
      if (plan.id === planId) {
        const newMembersList = plan.members.filter(u => u.userId !== leaverId);
        return {
          ...plan,
          members: newMembersList,
          joinedUsers: newMembersList,
          confirmedCount: newMembersList.filter(m => m.joinState === "going").length
        };
      }
      return plan;
    }));

    // 2. Database Persistence
    if (planUuid && userUuid && existingBefore && existingBefore.id) {
      await fetch("/api/db/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "plan_participants", match: { id: existingBefore.id } })
      }).catch(err => console.error("Failed to delete participant:", err));
    }

    // 3. Sync state from DB
    await refreshPlans();

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

    // 1. Update UI plans state locally
    setPlans(prevPlans => prevPlans.map(plan => {
      if (plan.id === planId) {
        const newMembersList = plan.members.map(u =>
          u.userId === passerId ? { ...u, joinState: "skipped" as const } : u
        );
        return {
          ...plan,
          members: newMembersList,
          joinedUsers: newMembersList.filter(m => m.joinState !== "passed" && m.joinState !== "skipped"),
          confirmedCount: newMembersList.filter(m => m.joinState === "going").length
        };
      }
      return plan;
    }));

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
    await refreshPlans();

    // Logging: status after action
    const refSnapshot = await fetch("/api/db/fetch-all").then(r => r.json()).catch(() => null);
    const existingAfter = refSnapshot?.data?.plan_participants?.find((p: any) => p.plan_id === planUuid && p.user_id === userUuid);
    console.log(`[PlansContext] Participant status AFTER action & DB refresh:`, existingAfter ? existingAfter.status : "none");
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

    // 1. Update participant status → "accepted"
    const existing = dbPlanParticipants.find(
      (p) => (p.plan_id === planUuid || p.plan_id === planId) && p.user_id === userUuid
    );
    if (existing && existing.id) {
      await updateParticipantStatus(existing.id, "accepted", "unpaid");
    } else {
      await insertParticipant({
        plan_id: planUuid,
        user_id: userUuid,
        status: "accepted",
        payment_status: "unpaid",
        joined_at: new Date().toISOString(),
      });
    }

    console.log(`[acceptPlan] User ${userUuid} accepted plan ${planUuid}`);

    // 2. Refresh and check if all non-host participants have accepted
    await refreshPlans();

    const freshRes = await fetch("/api/db/fetch-all");
    const freshJson = await freshRes.json();
    const freshParticipants = freshJson?.data?.plan_participants || [];
    const planParticipants = freshParticipants.filter(
      (pp: any) => pp.plan_id === planUuid
    );
    const nonHostParticipants = planParticipants.filter(
      (pp: any) => pp.status !== "host"
    );
    const allAccepted =
      nonHostParticipants.length > 0 &&
      nonHostParticipants.every((pp: any) => pp.status === "accepted");

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
      await refreshPlans();
    }

    // Check sports threshold transition
    if (matchedPlan && (matchedPlan.category === "sports" || (matchedPlan as any).sports_type || (matchedPlan as any).venue_id)) {
      const confirmedParticipants = planParticipants.filter(
        (pp: any) => pp.status === "accepted" || pp.status === "going" || pp.status === "host"
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
        await refreshPlans();
      }
    }
  };

  // ─── Decline Plan ─────────────────────────────────────────────────────────
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
      await updateParticipantStatus(existing.id, "declined", "unpaid");
    }

    // Optimistic UI update
    setPlans((prev) =>
      prev.map((plan) => {
        if (plan.id === planId) {
          const newMembers = plan.members.map((m) =>
            m.userUuid === userUuid ? { ...m, joinState: "passed" as const } : m
          );
          return { ...plan, members: newMembers, joinedUsers: newMembers };
        }
        return plan;
      })
    );
    await refreshPlans();
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
    await refreshPlans();
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
      await refreshPlans();
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

    const host      = rows.filter(r => r.status === "host").length;
    const going     = rows.filter(r => r.status === "going").length;
    const waitlist  = rows.filter(r => r.status === "waitlist").length;
    const delivered = rows.filter(r => r.status === "delivered").length;
    const seen      = rows.filter(r => r.status === "seen").length;
    const passed    = rows.filter(r => r.status === "passed" || r.status === "skipped").length;
    const pending   = delivered + seen;
    const total     = rows.length;

    const joinedCountVal = host + going;
    console.log(`[getParticipantCounts] PlanUuid: ${planUuid}`);
    console.log(`[getParticipantCounts] DB raw participants count: ${rows.length}`);
    console.log(`[getParticipantCounts] breakdown - host: ${host}, going: ${going}, waitlist: ${waitlist}, delivered: ${delivered}, seen: ${seen}, passed: ${passed}, pending: ${pending}`);
    console.log(`[getParticipantCounts] Joined count calculation (host + going): ${joinedCountVal}`);

    return { host, going, waitlist, delivered, seen, passed, pending, total };
  };

  const getHomeFeedPlans = (userIdStr: string) => {
    const userUuid = resolveUserUuid(userIdStr);
    const myParticipantRecords = dbPlanParticipants.filter(pp => pp.user_id === userUuid);

    const filtered = plans.filter(plan => {
      const planUuid = plan.dbUuid || plan.id;
      const ppRecord = myParticipantRecords.find(pp => pp.plan_id === planUuid);
      const isIncluded = ppRecord && ["delivered", "seen", "new"].includes(ppRecord.status);
      return !!isIncluded;
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

    const parseTimeToMinutesValue = (timeStr: string) => {
      if (!timeStr) return 0;
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return 0;
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const ampm = match[3].toUpperCase();
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    return filtered.sort((a, b) => {
      const secA = getTimelineSectionValue(a);
      const secB = getTimelineSectionValue(b);
      if (secA !== secB) return secA - secB;

      const dayA = getDayIndexValue(a.date);
      const dayB = getDayIndexValue(b.date);
      if (dayA !== dayB) return dayA - dayB;

      return parseTimeToMinutesValue(a.time) - parseTimeToMinutesValue(b.time);
    });
  };

  const getHubPlans = (userIdStr: string) => {
    // Show all plans where user is a participant (host or going) — for the Plans hub tab
    return plans.filter(plan => {
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
      joinPlan, leavePlan, passPlan, waitlistPlan, sendReminder, ignoreReminder, getHomeFeedPlans, getHubPlans, getParticipantCounts, refreshPlans,
      acceptPlan, declinePlan, hostPay, bookNow
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

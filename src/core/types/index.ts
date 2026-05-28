// Canonical schema aligning strictly with the user requested Planless database architecture
// Prefixed with Db for Relational Tables, with UI compatibility mappings for React views.

// ---------------------------------------------
// 7 CANONICAL DATABASE TABLES
// ---------------------------------------------

// 1. USERS TABLE
export interface User {
  user_id: string;
  username: string;
  full_name: string;
  phone_number: string;
  profile_photo: string;
  bio: string;
  college_or_work: string;
  created_at: string; // ISO format
  wallet_balance: number;
  active_status: boolean;
}

// 2. CIRCLES TABLE
export interface DbCircle {
  circle_id: string;
  name: string;
  description: string;
  category: string;
  created_by: string; // user_id U001 etc.
  cover_image: string;
  location_anchor: string;
  privacy: "public" | "private";
  created_at: string;
}

// 3. CIRCLE_MEMBERS TABLE (Relationship table connecting users to circles)
export interface DbCircleMember {
  circle_member_id: string;
  circle_id: string;
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
}

// 4. PLANS TABLE (The central focus object of everything in Planless)
export interface DbPlan {
  plan_id: string;
  title: string;
  description: string;
  created_by: string; // user_id
  circle_id: string | null; // linked circle
  activity_type: string; // e.g. "football", "sunset", "cafe", "movies", etc.
  location: string;
  datetime: string; // text representation or timestamp
  max_people: number;
  split_amount: number;
  payment_required: boolean;
  status: "active" | "completed" | "cancelled";
  created_at: string;
  coverImage?: string; // photo visual overlay URL
  theatre?: string;
  seatsLeft?: number;
  notes?: string;
  coordinatedSeat?: string;
  userRating?: number;
  userReaction?: string;
  isHappened?: boolean;
}

// 5. PLAN_PARTICIPANTS TABLE (Attendance & payment status)
export interface DbPlanParticipant {
  participant_id: string;
  plan_id: string;
  user_id: string;
  status: "new" | "going" | "waitlist" | "passed";
  payment_status: "paid" | "unpaid";
  joined_at: string;
}

// 6. TRANSACTIONS TABLE (Handles spontaneous social splits/obligations)
export interface DbTransaction {
  transaction_id: string;
  sender_id: string; // user_id or "TOPUP"
  receiver_id: string; // user_id or "SYSTEM"
  plan_id: string | null;
  amount: number;
  transaction_type: string; // "split_payment" | "deposit" | "settlement"
  status: "success" | "pending" | "failed";
  timestamp: string;
}

// 7. MEMORIES TABLE (Post-plan visual layer capturing shared identity)
export interface DbMemory {
  memory_id: string;
  plan_id: string;
  uploaded_by: string; // user_id
  media_url: string;
  caption: string;
  timestamp: string;
}

// ---------------------------------------------
// COMPATIBLE FRONTEND INTERACTIVES VIEW MODELS
// ---------------------------------------------

export type PlanState = "going" | "passed" | "waitlist" | "unanswered" | "delivered" | "seen" | "skipped";

export interface PlanMember {
  userId: string;
  name: string;
  avatar: string;
  joinState: PlanState;
  reminderState: "sent" | "none";
  joinedAt: string;
  checkedIn?: boolean;
}

// Backward compatibility alias for UI
export type JoinedUser = PlanMember;

export interface Plan {
  // Strict Backend Contracts
  id: string;
  title: string;
  groupId: string | null;
  hostId: string;
  members: PlanMember[];
  capacity: number;
  date: string;
  time: string;
  location: string;
  paymentAmount: number;
  status: "active" | "completed" | "cancelled";
  createdAt: string;

  // UI Legacy Properties (Synced with Strict Contracts)
  category: "movies" | "sports" | "restaurants" | "custom";
  cost: number;
  confirmedCount: number;
  maxSpots: number;
  coverImage: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  joinedUsers: JoinedUser[];
  timeline: "today" | "tomorrow" | "weekend";
  description?: string;
  theatre?: string;
  seatsLeft?: number;
  notes?: string;
  coordinatedSeat?: string;
  userRating?: number;
  userReaction?: string;
  isHappened?: boolean;
  isActive?: boolean;
  reminderNotificationSent?: boolean;
  circleId?: string | null;

  // Sports Plan fields
  skillLevel?: string;
  matchFormat?: string;
  waitlistUsers?: JoinedUser[];
  enteredScore?: string;
  votedMvp?: string;
  mvpVotes?: { name: string; votes: number }[];
  attendanceLogged?: boolean;

  // Restaurant Plan fields
  cuisineType?: string;
  tableAvailability?: string;
  estimatedCost?: string;
  interestedUsers?: JoinedUser[];
  foodReaction?: string;
}

export interface Circle {
  id: string;
  name: string;
  membersCount: number;
  avatars: string[];
  groupImage?: string;
  lastSpontaneousActivity: string;
  description: string;
  type: string;
  location: string;
  format: string;
  playersOnField: number;
  timeWindow: string;
  membersList: {
    name: string;
    phone: string;
    avatar: string;
  }[];
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: "credit" | "debit";
  timestamp: string;
  settled: boolean;
}

export interface NotificationItem {
  id: string;
  type: "invitation" | "urgency" | "payment" | "general";
  title: string;
  relativeTime: string;
  actionText?: string;
  planId?: string;
  settled?: boolean;
  cost?: number;
  creatorId?: string; // reference
}

export interface UserProfile {
  name: string;
  phone: string;
  bio: string;
  avatar: string;
  joined: boolean;
  college_or_work?: string;
  user_id?: string;
}

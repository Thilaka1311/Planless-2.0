// Canonical schema aligning strictly with the user requested Planless database architecture
// Prefixed with Db for Relational Tables, with UI compatibility mappings for React views.

// ---------------------------------------------
// 7 CANONICAL DATABASE TABLES
// ---------------------------------------------

// 1. USERS TABLE
export interface User {
  id?: string;          // UUID primary key (users.id) — used for all FK relationships
  user_id: string;      // Sequential display identifier e.g. "U001" — display only, NOT a FK
  username: string;
  full_name: string;
  phone_number: string;
  password_hash?: string;
  profile_photo: string;
  bio: string;
  college_or_work: string;
  created_at: string; // ISO format
  wallet_balance: number;
  active_status: boolean;
}


// 2. CIRCLES TABLE
export interface DbCircle {
  id?: string; // UUID primary key
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
  id?: string; // UUID primary key
  circle_member_id?: string;
  circle_id: string;
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
}

// 4. PLANS TABLE (The central focus object of everything in Planless)
export interface DbPlan {
  id?: string; // UUID primary key
  plan_id: string; // text unique UI identifier
  title: string;
  description: string;
  created_by: string; // uuid referencing users.id
  circle_id: string | null; // uuid referencing circles.id
  activity_type?: string; // e.g. "movies", "sports", "restaurants", "custom"
  location: string;
  datetime?: string; // combined e.g. "TODAY • 8:00 PM"
  max_people?: number;
  split_amount?: number;
  payment_required?: boolean;
  status: "active" | "completed" | "cancelled" | string;
  created_at: string;
  waitlist_enabled?: boolean;
  join_limit?: number;
  // Extended optional fields (stored in extra Supabase columns if present)
  theatre?: string;
  seatsLeft?: number;
  notes?: string;
  coordinatedSeat?: string;
  userRating?: number;
  userReaction?: string;
  isHappened?: boolean;
  // UI compatibility mapping fields
  category?: string;
  date?: string;
  time?: string;
  max_spots?: number;
  cost?: number;
  cover_image?: string;
}

// 5. PLAN_PARTICIPANTS TABLE (Attendance & payment status)
export interface DbPlanParticipant {
  id?: string; // UUID primary key
  participant_id: string; // text unique
  plan_id: string; // uuid referencing plans.id
  user_id: string; // uuid referencing users.id
  status: "new" | "going" | "waitlist" | "passed" | string;
  payment_status: "paid" | "unpaid" | string;
  joined_at: string;
}

// 6. TRANSACTIONS TABLE (Handles spontaneous social splits/obligations)
export interface DbTransaction {
  id?: string; // UUID primary key
  transaction_id: string;
  sender_id: string | null; // UUID → users.id (or special values: "SYSTEM", "UPI", null)
  receiver_id: string | null; // UUID → users.id (or special values: "SYSTEM", null)
  plan_id: string | null;
  amount: number;
  transaction_type: string; // "split_payment" | "deposit" | "settlement"
  status: "success" | "pending" | "failed";
  timestamp: string;
}

// 7. MEMORIES TABLE (Post-plan visual layer capturing shared identity)
export interface DbMemory {
  id?: string; // UUID primary key
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

export type PlanState = "going" | "passed" | "waitlist" | "unanswered" | "delivered" | "seen" | "skipped" | "host";

export interface PlanMember {
  userId: string;
  userUuid?: string;
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
  dbUuid?: string;
  title: string;
  groupId: string | null;
  hostId: string;
  members: PlanMember[];
  capacity?: number;
  date: string;
  time: string;
  location: string;
  paymentAmount: number;
  status: "active" | "completed" | "cancelled";
  createdAt: string;
  waitlistEnabled?: boolean;
  joinLimit?: number;

  // UI Legacy Properties (Synced with Strict Contracts)
  category: "movies" | "sports" | "restaurants" | "custom";
  cost: number;
  confirmedCount: number;
  maxSpots?: number;
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
  circleName?: string | null;

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
  dbUuid?: string;
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
  status?: string;
  transactionType?: string;
  planTitle?: string | null;
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
  dbUuid?: string;
}

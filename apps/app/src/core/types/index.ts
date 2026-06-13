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
  role: "host" | "co_host" | "member";
  joined_at: string;
}

// 4. PLANS TABLE (The central focus object of everything in Planless)
export interface DbPlan {
  id?: string; // UUID primary key
  plan_id: string; // text unique UI identifier
  title: string;
  description: string;
  created_by: string; // uuid referencing users.id
  host_id?: string; // uuid referencing users.id (mutable host reference)
  circle_id: string | null; // uuid referencing circles.id
  activity_type?: string | null; // e.g. "movies", "sports", "restaurants", "custom"
  category?: string;
  location: string;
  datetime?: string; // combined e.g. "TODAY • 8:00 PM"
  max_people?: number;
  split_amount?: number;
  payment_required?: boolean;
  status: "active" | "completed" | "cancelled" | "PENDING" | "BOOKING_READY" | "CONFIRMED" | "SLOT_UNAVAILABLE" | string;
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
  date?: string;
  time?: string;
  max_spots?: number;
  cost?: number;
  cover_image?: string;
  sports_type?: "Football" | "Badminton" | "Basketball" | string;
  venue_id?: string;
  venue_cost?: number;
  required_confirmations?: number;
  slot_label?: string;
  acceptance_status?: "waiting" | "confirmed" | "paid";
  min_participants?: number;
  response_cutoff_hours?: number;
  response_deadline_at?: string;
}

// 5. PLAN_PARTICIPANTS TABLE (Attendance & payment status)
export interface DbPlanParticipant {
  id?: string; // UUID primary key
  participant_id: string; // text unique
  plan_id: string; // uuid referencing plans.id
  user_id: string; // uuid referencing users.id
  status: "new" | "going" | "waitlist" | "passed" | "seen" | "skipped" | string;
  payment_status: "paid" | "unpaid" | string;
  joined_at: string;
  waitlisted_at?: string | null;
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
  id: string;
  plan_id: string;
  memory_type: string;
  status: string;
  created_at: string;
  locked_at: string | null;
  editable_until: string;
}

export interface DbMemoryAttendee {
  id: string;
  memory_id: string;
  user_id: string;
  created_at: string;
}

export interface DbMemoryMovieVerdict {
  id: string;
  memory_id: string;
  user_id: string;
  verdict: "loved_it" | "good" | "not_for_me";
  created_at: string;
}

export interface DbMemoryRestaurantVote {
  id: string;
  memory_id: string;
  user_id: string;
  vote: "yes" | "maybe" | "no";
  created_at: string;
}

export interface DbMemoryMatchResult {
  id: string;
  memory_id: string;
  team_a_score: number;
  team_b_score: number;
  recorded_by: string;
  created_at: string;
}

export interface DbMemoryMvpVote {
  id: string;
  memory_id: string;
  voter_user_id: string;
  mvp_user_id: string;
  created_at: string;
}

export interface DbMemoryBadmintonResult {
  id: string;
  memory_id: string;
  user_id: string;
  wins: number;
  losses: number;
  created_at: string;
  updated_at: string;
}

export interface DbFriendship {
  id?: string; // UUID primary key
  sender_id: string; // UUID -> users.id
  receiver_id: string; // UUID -> users.id
  created_at?: string;
}

// 8. PLAN_TEAM_ASSIGNMENTS TABLE (Football Team Organizer)
export interface DbPlanTeamAssignment {
  id?: string;       // UUID primary key
  plan_id: string;   // UUID → plans.id
  user_id: string;   // UUID → users.id
  team: "A" | "B";
  created_at?: string;
}

// ---------------------------------------------
// COMPATIBLE FRONTEND INTERACTIVES VIEW MODELS
// ---------------------------------------------

export type PlanState = "going" | "passed" | "waitlist" | "unanswered" | "delivered" | "seen" | "skipped";

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
  status: "active" | "completed" | "cancelled" | "PENDING" | "BOOKING_READY" | "CONFIRMED" | "SLOT_UNAVAILABLE";
  datetime?: string;
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
  response_cutoff_hours?: number;
  response_deadline_at?: string;

  // Sports Plan fields
  sports_type?: "Football" | "Badminton" | "Basketball";
  venue_id?: string;
  venue_cost?: number;
  required_confirmations?: number;
  slot_label?: string;
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
  type: "PLAN_INVITATION" | "WAITLIST_PROMOTED" | "PLAN_CANCELLED" | "PLAN_UPDATED" | "HOST_TRANSFERRED" | "PARTICIPANT_JOINED" | "PARTICIPANT_SKIPPED" | "invitation" | "urgency" | "payment" | "general" | string;
  title: string;
  body?: string;
  relativeTime: string;
  actionText?: string;
  planId?: string;
  settled?: boolean;
  cost?: number;
  creatorId?: string;
  createdAt?: string;
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

export type ActivityType = "Football" | "Badminton" | "Movie" | "Dinner" | "Cafe" | "Pub" | "Sports" | "Movies" | "Dining";

export interface ActivityTimeSlot {
  label: string;
  iso: string;
  locked?: boolean;
}

export interface ActivityVenue {
  id: string;
  name: string;
  costPerPerson: number;
  timeSlots: ActivityTimeSlot[];
  tags: string[];
  distance: string;
  image: string;
  venue_cost: number;
}

export interface ChatMessage {
  id: string;
  circleId: string;
  parentId: string | null;
  planId: string | null;
  sender: {
    id: string;
    name: string;
    avatar: string;
  } | null;
  systemActor: {
    id: string;
    name: string;
    avatar: string;
  } | null;
  content: string;
  type: "user" | "system";
  createdAt: string;
  editedAt: string | null;
  isOwn: boolean;
}


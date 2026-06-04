import { 
  User, DbCircle, DbCircleMember, DbPlan, DbPlanParticipant, DbTransaction, DbMemory, 
  NotificationItem, UserProfile, Plan, Circle, Transaction 
} from "../../core/types";

// Generates an elegant SVG initials avatar with consistent flat-gradient highlights 
// to align with the required 'Opal design philosophy' and prevent random placeholder noise.
export function getInitialsAvatar(name: string): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  const initials = parts.map(p => p[0]).slice(0, 2).join("").toUpperCase();
  
  // Consistent color selection based on initials hash code
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  // Elegant high contrast desaturated pastel hues
  const bgGradientStart = `hsl(${hue}, 40%, 35%)`;
  const bgGradientEnd = `hsl(${(hue + 45) % 360}, 45%, 22%)`;
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <defs>
      <linearGradient id="g_${initials}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgGradientStart}"/>
        <stop offset="100%" stop-color="${bgGradientEnd}"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" fill="url(#g_${initials})"/>
    <text x="50%" y="54%" font-family="system-ui, -apple-system, BlinkMacSystemFont, sans-serif" font-weight="700" font-size="34" fill="#f4f4f5" text-anchor="middle" dominant-baseline="middle" letter-spacing="-0.03em">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// ----------------------------------------------------
// 1. USERS TABLE
// ----------------------------------------------------
export const initialUsers: User[] = [
  {
    user_id: "U001",
    username: "thilak",
    full_name: "VR Thilaka Sundar",
    phone_number: "+91 90002 00001",
    profile_photo: getInitialsAvatar("VR Thilaka Sundar"),
    bio: "Always spontaneous, never planless • Looking for movies/football.",
    college_or_work: "SRM Chennai",
    created_at: "2026-05-10T12:00:00Z",
    wallet_balance: 580,
    active_status: true,
  },
  {
    user_id: "U002",
    username: "keval",
    full_name: "Keval",
    phone_number: "+91 90001 00002",
    profile_photo: getInitialsAvatar("Keval"),
    bio: "Semi-pro midfielder. Turf organizer on New Bel Road.",
    college_or_work: "MSRIT Bangalore",
    created_at: "2026-05-11T09:15:00Z",
    wallet_balance: 320,
    active_status: true,
  },
  {
    user_id: "U003",
    username: "medhaj",
    full_name: "Medhaj",
    phone_number: "+91 90001 00001",
    profile_photo: getInitialsAvatar("Medhaj"),
    bio: "Left winger. Spontaneous plans and strong filter coffee.",
    college_or_work: "PES University",
    created_at: "2026-05-11T14:30:00Z",
    wallet_balance: 450,
    active_status: true,
  },
  {
    user_id: "U004",
    username: "guhan",
    full_name: "Guhan",
    phone_number: "+91 90003 00001",
    profile_photo: getInitialsAvatar("Guhan"),
    bio: "Weekend drives & cafe hopper. Glen's critic.",
    college_or_work: "SRM University",
    created_at: "2026-05-12T10:00:00Z",
    wallet_balance: 1200,
    active_status: true,
  },
  {
    user_id: "U005",
    username: "rahul",
    full_name: "Rahul",
    phone_number: "+91 90002 00002",
    profile_photo: getInitialsAvatar("Rahul"),
    bio: "Sunset chaser & late night highway drives.",
    college_or_work: "VIT Chennai",
    created_at: "2026-05-12T11:45:00Z",
    wallet_balance: 200,
    active_status: true,
  },
  {
    user_id: "U006",
    username: "sudeshna",
    full_name: "Sudeshna",
    phone_number: "+91 90003 00004",
    profile_photo: getInitialsAvatar("Sudeshna"),
    bio: "Loves book cafes, live gigs, and spontaneous street food runs.",
    college_or_work: "Stella Maris College",
    created_at: "2026-05-13T08:00:00Z",
    wallet_balance: 650,
    active_status: true,
  },
  {
    user_id: "U007",
    username: "raghavan",
    full_name: "Raghavan",
    phone_number: "+91 90002 00003",
    profile_photo: getInitialsAvatar("Raghavan"),
    bio: "Talk movies and acoustic music.",
    college_or_work: "IIT Madras",
    created_at: "2026-05-13T09:30:00Z",
    wallet_balance: 380,
    active_status: true,
  },
  {
    user_id: "U008",
    username: "pratyush",
    full_name: "Pratyush",
    phone_number: "+91 90002 00004",
    profile_photo: getInitialsAvatar("Pratyush"),
    bio: "Design is how it works. Coffee enthusiast.",
    college_or_work: "NID Ahmedabad",
    created_at: "2026-05-13T16:20:00Z",
    wallet_balance: 750,
    active_status: true,
  },
  {
    user_id: "U009",
    username: "neelesh",
    full_name: "Neelesh",
    phone_number: "+91 90002 00005",
    profile_photo: getInitialsAvatar("Neelesh"),
    bio: "Always down for spontaneous road trips.",
    college_or_work: "LPU Jalandhar",
    created_at: "2026-05-14T11:00:00Z",
    wallet_balance: 140,
    active_status: true,
  },
  {
    user_id: "U010",
    username: "ravi",
    full_name: "Ravi",
    phone_number: "+91 90003 00003",
    profile_photo: getInitialsAvatar("Ravi"),
    bio: "Hot chocolate and indie games.",
    college_or_work: "BITS Pilani",
    created_at: "2026-05-14T15:30:00Z",
    wallet_balance: 500,
    active_status: true,
  },
  {
    user_id: "U011",
    username: "vinod",
    full_name: "Vinod",
    phone_number: "+91 90002 00006",
    profile_photo: getInitialsAvatar("Vinod"),
    bio: "Popcorn & cinematography debates.",
    college_or_work: "Satyajit Ray Film Inst",
    created_at: "2026-05-15T12:00:00Z",
    wallet_balance: 300,
    active_status: true,
  },
  {
    user_id: "U012",
    username: "renjith",
    full_name: "Renjith",
    phone_number: "+91 90001 00008",
    profile_photo: getInitialsAvatar("Renjith"),
    bio: "Late night drives, old music, football on weekends.",
    college_or_work: "GCE Trivandrum",
    created_at: "2026-05-15T14:00:00Z",
    wallet_balance: 400,
    active_status: true,
  },
  {
    user_id: "U013",
    username: "maanas",
    full_name: "Maanas",
    phone_number: "+91 90004 00004",
    profile_photo: getInitialsAvatar("Maanas"),
    bio: "Spontaneous explorer • Always ready for coffee, roadtrips and turf runs.",
    college_or_work: "PES University",
    created_at: "2026-05-16T10:00:00Z",
    wallet_balance: 600,
    active_status: true,
  }
];

// Current Session Profile compatibility wrapper
export const initialUserProfile = {
  user_id: "U001",
  name: "VR Thilaka Sundar",
  phone: "+91 90002 00001",
  bio: "Always spontaneous, never planless • Looking for movies/football.",
  avatar: getInitialsAvatar("VR Thilaka Sundar"),
  joined: true,
  college_or_work: "SRM Chennai",
};

// ----------------------------------------------------
// 2. CIRCLES TABLE
// ----------------------------------------------------
export const initialCircles: DbCircle[] = [
  {
    circle_id: "C001",
    name: "Navkis Matchday",
    description: "Football Group based out of New Bel Road. Format: 7v7, 14 players on field.",
    category: "football",
    created_by: "U002", // Keval
    cover_image: "/navkis_matchday.png",
    location_anchor: "New Bel Road",
    privacy: "private",
    created_at: "2026-05-15T17:00:00Z"
  },
  {
    circle_id: "C002",
    name: "Midnight Masala",
    description: "Friends who make spontaneous plans including dinners, drives, cafés, and beach hangouts.",
    category: "sunset",
    created_by: "U005", // Rahul
    cover_image: "https://images.unsplash.com/photo-1518063319789-7217e6706b04?auto=format&fit=crop&q=80&w=600",
    location_anchor: "Marina Beach Breeze Point",
    privacy: "private",
    created_at: "2026-05-16T18:30:00Z"
  },
  {
    circle_id: "C003",
    name: "Jobis",
    description: "Close friend group for hanging out, cafés, late-night waffles, and spontaneous chill meetups.",
    category: "cafe",
    created_by: "U004", // Guhan
    cover_image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=600",
    location_anchor: "Glen's Bakehouse New Bel Road",
    privacy: "private",
    created_at: "2026-05-17T11:00:00Z"
  }
];

// ----------------------------------------------------
// 3. CIRCLE_MEMBERS TABLE (Stores relationships connecting users to circles)
// ----------------------------------------------------
export const initialCircleMembers: DbCircleMember[] = [
  // C001 Navkis Members
  { circle_member_id: "CM001", circle_id: "C001", user_id: "U002", role: "admin", joined_at: "2026-05-15T17:05:00Z" }, // Keval
  { circle_member_id: "CM002", circle_id: "C001", user_id: "U003", role: "member", joined_at: "2026-05-15T17:10:00Z" }, // Medhaj
  { circle_member_id: "CM003", circle_id: "C001", user_id: "U001", role: "member", joined_at: "2026-05-15T17:15:00Z" }, // Thilaka (You)
  { circle_member_id: "CM004", circle_id: "C001", user_id: "U012", role: "member", joined_at: "2026-05-15T17:20:00Z" }, // Renjith
  
  // C002 Midnight Masala Members
  { circle_member_id: "CM101", circle_id: "C002", user_id: "U005", role: "admin", joined_at: "2026-05-16T18:35:00Z" }, // Rahul
  { circle_member_id: "CM102", circle_id: "C002", user_id: "U001", role: "member", joined_at: "2026-05-16T18:40:00Z" }, // Thilaka
  { circle_member_id: "CM103", circle_id: "C002", user_id: "U007", role: "member", joined_at: "2026-05-16T18:42:00Z" }, // Raghavan
  { circle_member_id: "CM104", circle_id: "C002", user_id: "U008", role: "member", joined_at: "2026-05-16T18:45:00Z" }, // Pratyush
  { circle_member_id: "CM105", circle_id: "C002", user_id: "U009", role: "member", joined_at: "2026-05-16T18:50:00Z" }, // Neelesh
  
  // C003 Jobis Members
  { circle_member_id: "CM201", circle_id: "C003", user_id: "U004", role: "admin", joined_at: "2026-05-17T11:05:00Z" }, // Guhan
  { circle_member_id: "CM202", circle_id: "C003", user_id: "U001", role: "member", joined_at: "2026-05-17T11:10:00Z" }, // Thilaka
  { circle_member_id: "CM203", circle_id: "C003", user_id: "U010", role: "member", joined_at: "2026-05-17T11:12:00Z" }, // Ravi
  { circle_member_id: "CM204", circle_id: "C003", user_id: "U006", role: "member", joined_at: "2026-05-17T11:15:00Z" }, // Sudeshna
  { circle_member_id: "CM205", circle_id: "C003", user_id: "U011", role: "member", joined_at: "2026-05-17T11:20:00Z" }  // Vinod
];

// ----------------------------------------------------
// 4. PLANS TABLE (Central focal point)
// ----------------------------------------------------
export const initialPlans: DbPlan[] = [
  {
    plan_id: "P001",
    title: "Football Tonight",
    description: "Turf Booking on New Bel Road. Format: 7v7, 14 players on field. Arrive by 7:45 PM.",
    created_by: "U002", // Keval
    circle_id: "C001",
    category: "football",
    location: "New Bel Road Turf Arena",
    date: "TODAY",
    time: "8:00 PM",
    max_spots: 14,
    cost: 350,
    status: "active",
    created_at: "2026-05-23T10:00:00Z",
    cover_image: "/navkis_matchday.png"
  },
  {
    plan_id: "P002",
    title: "Midnight Masala Drive & Sunset",
    description: "Late night drive to Marina Beach breeze point. Spark spontaneous ocean conversations.",
    created_by: "U005", // Rahul
    circle_id: "C002",
    category: "sunset",
    location: "Marina Beach Breeze Point",
    date: "TODAY",
    time: "10:30 PM",
    max_spots: 9,
    cost: 150,
    status: "active",
    created_at: "2026-05-23T12:00:00Z",
    cover_image: "https://images.unsplash.com/photo-1518063319789-7217e6706b04?auto=format&fit=crop&q=80&w=600"
  },
  {
    plan_id: "P003",
    title: "Jobis Late Night Waffles",
    description: "Late-night waffle discussions and hot coffee at Glen's.",
    created_by: "U004", // Guhan
    circle_id: "C003",
    category: "brunch",
    location: "Glen's Bakehouse, New Bel Road",
    date: "Sat",
    time: "11:30 PM",
    max_spots: 14,
    cost: 250,
    status: "active",
    created_at: "2022-05-22T15:00:00Z",
    cover_image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=600"
  },
  {
    plan_id: "P005",
    title: "The Spice Room",
    description: "Spontaneous North Indian feast! Warm curries and freshly baked garlic naans under outdoor lights.",
    created_by: "U002", // Keval
    circle_id: "C003",
    category: "brunch",
    location: "Koramangala, Bangalore",
    date: "TOMORROW",
    time: "8:00 PM",
    max_spots: 8,
    cost: 700,
    status: "active",
    created_at: "2026-05-23T14:00:00Z",
    cover_image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=600",
    notes: "Birthday dinner celebration. Dress code: Casual."
  },
  {
    plan_id: "P006",
    title: "Turf Session",
    description: "Friendly match format. Fast paced spontaneous turf session on New Bel Road. Bring a dark jersey.",
    created_by: "U002", // Keval
    circle_id: "C001",
    category: "football",
    location: "New Bel Road Turf Arena",
    date: "TOMORROW",
    time: "6:30 PM",
    max_spots: 14,
    cost: 350,
    status: "active",
    created_at: "2026-05-23T15:00:00Z",
    cover_image: "https://images.unsplash.com/photo-1543807535-eceef0bc6599?auto=format&fit=crop&w=600&q=80"
  },
  {
    plan_id: "P007",
    title: "Movie Night",
    description: "Catching the IMAX screening of Dune: Part Two! Grab popcorn and meet us in the lounge early.",
    created_by: "U007", // Raghavan
    circle_id: null,
    category: "movies",
    location: "PVR IMAX Forum Koramangala",
    date: "TODAY",
    time: "9:15 PM",
    max_spots: 8,
    cost: 380,
    status: "active",
    created_at: "2026-05-23T16:00:00Z",
    cover_image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80"
  },
  {
    plan_id: "P008",
    title: "Late Night Chai",
    description: "Late night drives call for strong roadside ginger chai. Spontaneous highway catchups.",
    created_by: "U005", // Rahul
    circle_id: "C002",
    category: "brunch",
    location: "Tea Joint, HSR Layout",
    date: "TODAY",
    time: "11:45 PM",
    max_spots: 12,
    cost: 0,
    status: "active",
    created_at: "2026-05-23T17:00:00Z",
    cover_image: "https://images.unsplash.com/photo-1563887556868-f9ac3716550f?auto=format&fit=crop&w=600&q=80"
  },
  {
    plan_id: "P009",
    title: "Library Meetup",
    description: "Spontaneous exam prep sprint. Grabbing coffee afterwards to celebrate surviving midterm weeks.",
    created_by: "U003", // Medhaj
    circle_id: "C003",
    category: "custom",
    location: "Central Library, SRM Campus",
    date: "TOMORROW",
    time: "10:00 AM",
    max_spots: 6,
    cost: 0,
    status: "active",
    created_at: "2026-05-23T18:00:00Z",
    cover_image: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=600&q=80"
  },
  {
    plan_id: "P010",
    title: "Random Dinner Run",
    description: "Late night biryani cravings require instant midnight Empire runs. Split equally.",
    created_by: "U002", // Keval
    circle_id: "C003",
    category: "brunch",
    location: "Empire Restaurant, New Bel Road",
    date: "Sat",
    time: "9:00 PM",
    max_spots: 8,
    cost: 450,
    status: "active",
    created_at: "2026-05-23T19:00:00Z",
    cover_image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80"
  },
  {
    plan_id: "P011",
    title: "Sunday Football Matchday",
    description: "Spontaneous weekend turf action. Settle format, high energy levels expected.",
    created_by: "U003", // Medhaj
    circle_id: "C001",
    category: "football",
    location: "HSR Turf Park",
    date: "Sun",
    time: "4:00 PM",
    max_spots: 14,
    cost: 300,
    status: "active",
    created_at: "2026-05-23T20:00:00Z",
    cover_image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80"
  },
  {
    plan_id: "P012",
    title: "Café Meetup",
    description: "Spontaneous filter coffee and study session anchor. Third Wave coffee catchups.",
    created_by: "U004", // Guhan
    circle_id: "C003",
    category: "brunch",
    location: "Third Wave Coffee, New Bel Road",
    date: "TOMORROW",
    time: "4:30 PM",
    max_spots: 10,
    cost: 200,
    status: "active",
    created_at: "2026-05-23T21:00:00Z",
    cover_image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=600"
  },
  {
    plan_id: "P013",
    title: "Majaa Thindi Breakfast Run",
    description: "Spontaneous breakfast meet! Enjoy delicious idlis, crispy dosas, and strong filter coffee.",
    created_by: "U005", // Rahul
    circle_id: "C002", // Midnight Masala
    category: "brunch",
    location: "Majaa Thindi, Vidyaranyapura",
    date: "TOMORROW",
    time: "9:00 AM",
    max_spots: 10,
    cost: 200,
    status: "active",
    created_at: "2026-05-27T18:00:00Z",
    cover_image: "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&w=600&q=80"
  }
];


// ----------------------------------------------------
// 5. PLAN_PARTICIPANTS TABLE
// ----------------------------------------------------
export const initialPlanParticipants: DbPlanParticipant[] = [
  // Navkis Matchday P001 attendees (12 members)
  { participant_id: "PP001", plan_id: "P001", user_id: "U002", status: "going", payment_status: "paid", joined_at: "2026-05-23T10:05:00Z" }, // Keval (Host)
  { participant_id: "PP002", plan_id: "P001", user_id: "U003", status: "going", payment_status: "paid", joined_at: "2026-05-23T10:10:00Z" }, // Medhaj
  { participant_id: "PP003", plan_id: "P001", user_id: "U001", status: "new", payment_status: "unpaid", joined_at: "2026-05-23T10:15:00Z" }, // Thilaka
  { participant_id: "PP004", plan_id: "P001", user_id: "U012", status: "going", payment_status: "paid", joined_at: "2026-05-23T10:20:00Z" }, // Renjith
  { participant_id: "PP005", plan_id: "P001", user_id: "U004", status: "going", payment_status: "paid", joined_at: "2026-05-23T10:25:00Z" }, // Guhan
  { participant_id: "PP006", plan_id: "P001", user_id: "U005", status: "going", payment_status: "paid", joined_at: "2026-05-23T10:30:00Z" }, // Rahul
  { participant_id: "PP007", plan_id: "P001", user_id: "U006", status: "going", payment_status: "paid", joined_at: "2026-05-23T10:35:00Z" }, // Sudeshna
  { participant_id: "PP008", plan_id: "P001", user_id: "U007", status: "going", payment_status: "paid", joined_at: "2026-05-23T10:40:00Z" }, // Raghavan
  { participant_id: "PP009", plan_id: "P001", user_id: "U008", status: "going", payment_status: "paid", joined_at: "2026-05-23T10:45:00Z" }, // Pratyush
  { participant_id: "PP010", plan_id: "P001", user_id: "U009", status: "going", payment_status: "paid", joined_at: "2026-05-23T10:50:00Z" }, // Neelesh
  { participant_id: "PP011", plan_id: "P001", user_id: "U010", status: "going", payment_status: "paid", joined_at: "2026-05-23T10:55:00Z" }, // Ravi
  { participant_id: "PP012", plan_id: "P001", user_id: "U011", status: "going", payment_status: "paid", joined_at: "2026-05-23T11:00:00Z" }, // Vinod
  
  // Midnight Masala P002 attendees
  { participant_id: "PP101", plan_id: "P002", user_id: "U005", status: "going", payment_status: "paid", joined_at: "2026-05-23T12:05:00Z" }, // Rahul (Host)
  { participant_id: "PP102", plan_id: "P002", user_id: "U001", status: "new", payment_status: "paid", joined_at: "2026-05-23T12:10:00Z" }, // Thilaka
  { participant_id: "PP103", plan_id: "P002", user_id: "U007", status: "going", payment_status: "paid", joined_at: "2026-05-23T12:12:00Z" }, // Raghavan
  { participant_id: "PP104", plan_id: "P002", user_id: "U008", status: "going", payment_status: "unpaid", joined_at: "2026-05-23T12:15:00Z" }, // Pratyush
  { participant_id: "PP105", plan_id: "P002", user_id: "U009", status: "going", payment_status: "unpaid", joined_at: "2026-05-23T12:20:00Z" }, // Neelesh
  
  // Jobis P003 attendees
  { participant_id: "PP201", plan_id: "P003", user_id: "U004", status: "going", payment_status: "paid", joined_at: "2026-05-22T15:10:00Z" }, // Guhan (Host)
  { participant_id: "PP202", plan_id: "P003", user_id: "U001", status: "new", payment_status: "unpaid", joined_at: "2026-05-22T15:15:00Z" }, // Thilaka (You) - owes 250
  { participant_id: "PP203", plan_id: "P003", user_id: "U010", status: "going", payment_status: "paid", joined_at: "2026-05-22T15:20:00Z" }, // Ravi
  { participant_id: "PP204", plan_id: "P003", user_id: "U006", status: "going", payment_status: "paid", joined_at: "2026-05-22T15:25:00Z" }, // Sudeshna
  // The Spice Room P005 attendees
  { participant_id: "PP401", plan_id: "P005", user_id: "U002", status: "going", payment_status: "paid", joined_at: "2026-05-23T14:05:00Z" }, // Keval (Host)
  { participant_id: "PP402", plan_id: "P005", user_id: "U003", status: "going", payment_status: "paid", joined_at: "2026-05-23T14:10:00Z" }, // Medhaj
  { participant_id: "PP403", plan_id: "P005", user_id: "U004", status: "going", payment_status: "paid", joined_at: "2026-05-23T14:15:00Z" }, // Guhan
  { participant_id: "PP404", plan_id: "P005", user_id: "U005", status: "going", payment_status: "paid", joined_at: "2026-05-23T14:20:00Z" }, // Rahul

  // Turf Session P006 attendees (5 players)
  { participant_id: "PP501", plan_id: "P006", user_id: "U002", status: "going", payment_status: "paid", joined_at: "2026-05-23T15:05:00Z" }, // Keval (Host)
  { participant_id: "PP502", plan_id: "P006", user_id: "U003", status: "going", payment_status: "paid", joined_at: "2026-05-23T15:10:00Z" }, // Medhaj
  { participant_id: "PP503", plan_id: "P006", user_id: "U005", status: "going", payment_status: "paid", joined_at: "2026-05-23T15:15:00Z" }, // Rahul
  { participant_id: "PP504", plan_id: "P006", user_id: "U004", status: "going", payment_status: "paid", joined_at: "2026-05-23T15:20:00Z" }, // Guhan
  { participant_id: "PP505", plan_id: "P006", user_id: "U012", status: "going", payment_status: "paid", joined_at: "2026-05-23T15:25:00Z" }, // Renjith
  { participant_id: "PP506", plan_id: "P006", user_id: "U001", status: "new", payment_status: "unpaid", joined_at: "2026-05-23T15:30:00Z" }, // Thilaka (Self)

  // IMAX Movie Night P007 attendees (8/8 full!)
  { participant_id: "PP601", plan_id: "P007", user_id: "U007", status: "going", payment_status: "paid", joined_at: "2026-05-23T16:05:00Z" }, // Raghavan (Host)
  { participant_id: "PP602", plan_id: "P007", user_id: "U002", status: "going", payment_status: "paid", joined_at: "2026-05-23T16:10:00Z" }, // Keval
  { participant_id: "PP603", plan_id: "P007", user_id: "U005", status: "going", payment_status: "paid", joined_at: "2026-05-23T16:15:00Z" }, // Rahul
  { participant_id: "PP604", plan_id: "P007", user_id: "U004", status: "going", payment_status: "paid", joined_at: "2026-05-23T16:20:00Z" }, // Guhan
  { participant_id: "PP605", plan_id: "P007", user_id: "U006", status: "going", payment_status: "paid", joined_at: "2026-05-23T16:25:00Z" }, // Sudeshna
  { participant_id: "PP606", plan_id: "P007", user_id: "U011", status: "going", payment_status: "paid", joined_at: "2026-05-23T16:30:00Z" }, // Vinod
  { participant_id: "PP607", plan_id: "P007", user_id: "U010", status: "going", payment_status: "paid", joined_at: "2026-05-23T16:35:00Z" }, // Ravi
  { participant_id: "PP608", plan_id: "P007", user_id: "U008", status: "going", payment_status: "paid", joined_at: "2026-05-23T16:40:00Z" }, // Pratyush

  // Late Night Chai Run P008 attendees (4 going)
  { participant_id: "PP701", plan_id: "P008", user_id: "U005", status: "going", payment_status: "paid", joined_at: "2026-05-23T17:05:00Z" }, // Rahul (Host)
  { participant_id: "PP702", plan_id: "P008", user_id: "U004", status: "going", payment_status: "paid", joined_at: "2026-05-23T17:10:00Z" }, // Guhan
  { participant_id: "PP703", plan_id: "P008", user_id: "U001", status: "new", payment_status: "paid", joined_at: "2026-05-23T17:15:00Z" }, // Thilaka (Self)
  { participant_id: "PP704", plan_id: "P008", user_id: "U006", status: "going", payment_status: "paid", joined_at: "2026-05-23T17:20:00Z" }, // Sudeshna

  // SRM Library Grind P009 attendees (3 going)
  { participant_id: "PP801", plan_id: "P009", user_id: "U001", status: "new", payment_status: "paid", joined_at: "2026-05-23T18:05:00Z" }, // Thilaka (Host / Self)
  { participant_id: "PP802", plan_id: "P009", user_id: "U003", status: "going", payment_status: "paid", joined_at: "2026-05-23T18:10:00Z" }, // Medhaj
  { participant_id: "PP803", plan_id: "P009", user_id: "U004", status: "going", payment_status: "paid", joined_at: "2026-05-23T18:15:00Z" }, // Guhan

  // Random Dinner Run P010 attendees (4 going)
  { participant_id: "PP901", plan_id: "P010", user_id: "U002", status: "going", payment_status: "paid", joined_at: "2026-05-23T19:05:00Z" }, // Keval (Host)
  { participant_id: "PP902", plan_id: "P010", user_id: "U003", status: "going", payment_status: "paid", joined_at: "2026-05-23T19:10:00Z" }, // Medhaj
  { participant_id: "PP903", plan_id: "P010", user_id: "U004", status: "going", payment_status: "paid", joined_at: "2026-05-23T19:15:00Z" }, // Guhan
  { participant_id: "PP904", plan_id: "P010", user_id: "U001", status: "new", payment_status: "paid", joined_at: "2026-05-23T19:20:00Z" }, // Thilaka (Self)

  // Sunday Football P011 attendees (10 going)
  { participant_id: "PPa01", plan_id: "P011", user_id: "U003", status: "going", payment_status: "paid", joined_at: "2026-05-23T20:05:00Z" }, // Medhaj (Host)
  { participant_id: "PPa02", plan_id: "P011", user_id: "U002", status: "going", payment_status: "paid", joined_at: "2026-05-23T20:10:00Z" }, // Keval
  { participant_id: "PPa03", plan_id: "P011", user_id: "U005", status: "going", payment_status: "paid", joined_at: "2026-05-23T20:15:00Z" }, // Rahul
  { participant_id: "PPa04", plan_id: "P011", user_id: "U004", status: "going", payment_status: "paid", joined_at: "2026-05-23T20:20:00Z" }, // Guhan
  { participant_id: "PPa05", plan_id: "P011", user_id: "U012", status: "going", payment_status: "paid", joined_at: "2026-05-23T20:25:00Z" }, // Renjith
  { participant_id: "PPa06", plan_id: "P011", user_id: "U011", status: "going", payment_status: "paid", joined_at: "2026-05-23T20:30:00Z" }, // Vinod
  { participant_id: "PPa07", plan_id: "P011", user_id: "U010", status: "going", payment_status: "paid", joined_at: "2026-05-23T20:35:00Z" }, // Ravi
  { participant_id: "PPa08", plan_id: "P011", user_id: "U008", status: "going", payment_status: "paid", joined_at: "2026-05-23T20:40:00Z" }, // Pratyush
  { participant_id: "PPa09", plan_id: "P011", user_id: "U009", status: "going", payment_status: "paid", joined_at: "2026-05-23T20:45:00Z" }, // Neelesh
  { participant_id: "PPa10", plan_id: "P011", user_id: "U006", status: "going", payment_status: "paid", joined_at: "2026-05-23T20:50:00Z" }, // Sudeshna
  { participant_id: "PPa11", plan_id: "P011", user_id: "U001", status: "new", payment_status: "unpaid", joined_at: "2026-05-23T20:55:00Z" }, // Thilaka (Self)

  // Third Wave Cafe Meetup P012 attendees (5 going)
  { participant_id: "PPb01", plan_id: "P012", user_id: "U004", status: "going", payment_status: "paid", joined_at: "2026-05-23T21:05:00Z" }, // Guhan (Host)
  { participant_id: "PPb02", plan_id: "P012", user_id: "U001", status: "new", payment_status: "paid", joined_at: "2026-05-23T21:10:00Z" }, // Thilaka (Self)
  { participant_id: "PPb03", plan_id: "P012", user_id: "U010", status: "going", payment_status: "paid", joined_at: "2026-05-23T21:15:00Z" }, // Ravi
  { participant_id: "PPb04", plan_id: "P012", user_id: "U006", status: "going", payment_status: "paid", joined_at: "2026-05-23T21:20:00Z" }, // Sudeshna
  { participant_id: "PPb05", plan_id: "P012", user_id: "U011", status: "going", payment_status: "paid", joined_at: "2026-05-23T21:25:00Z" }, // Vinod

  // Majaa Thindi Breakfast Run P013 attendees
  { participant_id: "PPc01", plan_id: "P013", user_id: "U001", status: "new",   payment_status: "unpaid", joined_at: "2026-05-27T18:05:00Z" }, // Thilaka (Host)
  { participant_id: "PPc02", plan_id: "P013", user_id: "U012", status: "going", payment_status: "paid", joined_at: "2026-05-27T18:10:00Z" }, // Renjith
  { participant_id: "PPc03", plan_id: "P013", user_id: "U005", status: "going", payment_status: "paid", joined_at: "2026-05-27T18:15:00Z" }, // Rahul
  { participant_id: "PPc04", plan_id: "P013", user_id: "U011", status: "going", payment_status: "paid", joined_at: "2026-05-27T18:20:00Z" }, // Vinod
  { participant_id: "PPc05", plan_id: "P013", user_id: "U009", status: "going", payment_status: "paid", joined_at: "2026-05-27T18:25:00Z" }, // Neelesh
  { participant_id: "PPc06", plan_id: "P013", user_id: "U007", status: "new",   payment_status: "unpaid", joined_at: "2026-05-27T18:30:00Z" }, // Raghavan (Midnight Masala member, not accepted)
  { participant_id: "PPc07", plan_id: "P013", user_id: "U008", status: "new",   payment_status: "unpaid", joined_at: "2026-05-27T18:35:00Z" }  // Pratyush (Midnight Masala member, not accepted)
];

// ----------------------------------------------------
// 6. TRANSACTIONS TABLE
// ----------------------------------------------------
export const initialTransactions: DbTransaction[] = [
  {
    transaction_id: "T001",
    sender_id: "SYSTEM",
    receiver_id: "U001",
    plan_id: null,
    amount: 1000,
    transaction_type: "deposit",
    status: "success",
    timestamp: "May 23, 2026"
  },
  {
    transaction_id: "T002",
    sender_id: "U001",
    receiver_id: "U004", // paid Guhan
    plan_id: "P003",
    amount: 250,
    transaction_type: "split_payment",
    status: "success",
    timestamp: "May 23, 2026"
  },
  {
    transaction_id: "T003",
    sender_id: "U001",
    receiver_id: "U002", // booked Keval's 7v7 slot
    plan_id: "P001",
    amount: 350,
    transaction_type: "split_payment",
    status: "success",
    timestamp: "May 22, 2026"
  }
];


// ----------------------------------------------------
// 7. MEMORIES TABLE (Post-plan memories layer)
// ----------------------------------------------------
export const initialMemories: DbMemory[] = [
  {
    memory_id: "M001",
    plan_id: "P001", // Navkis Matchday
    uploaded_by: "U002", // Keval
    media_url: "https://images.unsplash.com/photo-1517521782213-e7a9c422c83d?auto=format&fit=crop&q=80&w=400",
    caption: "What a crazy 7v7 tonight. Clinched the winning goal at the buzzer! 🔥",
    timestamp: "2026-05-23T16:45:00Z"
  },
  {
    memory_id: "M002",
    plan_id: "P001", // Navkis Matchday
    uploaded_by: "U003", // Medhaj
    media_url: "https://images.unsplash.com/photo-1516567727245-ad8c68f3ec93?auto=format&fit=crop&q=80&w=400",
    caption: "Absolute masterclass from everyone on New Bel Road. Spot on coordination!",
    timestamp: "2026-05-23T17:00:00Z"
  },
  {
    memory_id: "M003",
    plan_id: "P002", // Midnight Masala Sunset & Drive
    uploaded_by: "U005", // Rahul
    media_url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=400",
    caption: "The breeze tonight is therapeutic. Marina never disappoints.",
    timestamp: "2026-05-23T17:30:00Z"
  }
];

// Auxiliary Mock notifications for the tray
export const initialNotifications: NotificationItem[] = [
  {
    id: "n1",
    type: "invitation",
    title: "Keval invited you to Navkis Matchday 7v7",
    relativeTime: "1m",
    actionText: "Accept & Join",
    planId: "P001"
  },
  {
    id: "n2",
    type: "urgency",
    title: "Midnight Masala is filling up - 3 SPOTS LEFT",
    relativeTime: "12m",
    planId: "P002"
  },
  {
    id: "n3",
    type: "urgency",
    title: "Navkis kickoff is in 1 hour - ARRIVE BY 7:45 PM",
    relativeTime: "30m",
    planId: "P001"
  },
  {
    id: "n4",
    type: "payment",
    title: "You owe Guhan ₹250 for waffles - TAP TO SETTLE",
    relativeTime: "2h",
    actionText: "Instant Settle",
    planId: "P003",
    cost: 250,
    settled: false
  },
  {
    id: "n5",
    type: "general",
    title: "Guhan created a new meetup thread: Jobis",
    relativeTime: "1d"
  }
];

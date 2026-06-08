# PROFILE LIFECYCLE

## Purpose

The Profile represents a user's identity within Planless.

Profiles provide context for coordination.

Profiles are not content hubs.

Profiles are not influencer pages.

Profiles are not popularity systems.

The purpose of a profile is to help users understand:

* who someone is
* what circles they share
* what plans they have participated in together

---

# Core Philosophy

Profiles should feel:

* personal
* lightweight
* social
* trustworthy
* human

Profiles should never feel:

* performative
* competitive
* content-driven
* engagement-focused

The profile exists to support coordination.

Not attention.

---

# Account Creation Flow

Users create accounts using:

Email

↓

OTP Verification

↓

Account Created

↓

Profile Created

Each user owns exactly one profile.

Database:

users

is the source of truth.

---

# Profile Components

## Identity

Core profile information:

* Profile Photo
* Full Name

These help users recognize one another during planning.

---

## Personal Context

Optional information:

* Bio

Bio provides lightweight personal context.

Users should never be required to complete a bio.

---

## Circles

Profiles should display:

* Circles the user currently belongs to

Circles help explain a user's social context.

---

## Plans

Profiles should display:

### Hosted Plans

Plans created by the user.

### Going Plans

Plans the user has joined.

### Historical Plans

Completed plans the user participated in.

Plans should be displayed for coordination context.

Not as achievements.

---

# Profile Editing Flow

## Trigger

User selects:

Edit Profile

### Editable Fields

* Profile Photo
* Full Name
* Bio

### Result

Database updates.

Profile refreshes.

Changes persist across sessions.

---

# Profile Photo Rules

Users may:

* upload
* replace
* remove

their profile photo.

Profile photos should prioritize recognition.

---

# Circle Visibility Rules

## Profile Owner

May see:

* All current circles

---

## Other Users

May only see:

* Shared circles

Users should not see circles they do not share.

---

# Friend Visibility Rules

Friendships are private.

Users may see their own friends.

Users may NOT see:

* another user's friends
* friend counts
* mutual friend counts

The friendship graph should never become a public social feature.

---

# Plan Visibility Rules

## Profile Owner

May see:

* Hosted Plans
* Going Plans
* Historical Plans

---

## Other Users

May only see:

* Shared plans
* Historical plans that both users participated in

Users should not gain visibility into unrelated plans.

---

# Wallet Visibility Rules

Wallet information is private.

Only the profile owner may see:

* wallet balance
* transactions
* payment history

Wallet information must never be publicly visible.

---

# Historical Preservation Rules

Leaving a Circle should not remove:

* friendships
* completed plans
* historical participation

Historical records remain intact.

The profile should preserve the user's history.

---

# Profile Discovery Rules

Profiles may be discovered through:

* circles
* plans
* participant lists

Do NOT support:

* public profile browsing
* global user discovery
* recommended users
* influencer discovery

Planless is not a social network.

---

# What Other Users Can See

When viewing another user's profile, users may only see:

* Profile Photo
* Full Name
* Bio
* Shared Circles
* Shared Historical Plans

Nothing else should be visible.

This keeps profiles focused on coordination rather than social comparison.

---

# State Transitions

Create Account

↓

Create Profile

Edit Profile

↓

Profile Updated

Join Circle

↓

Circle Appears

Create Plan

↓

Hosted Plan Appears

Join Plan

↓

Going Plan Appears

Complete Plan

↓

Historical Plan Appears

---

# Non-Negotiable Rules

1. Profiles exist to support coordination.

2. Profiles are not influencer pages.

3. Profiles are not content destinations.

4. Profiles should never display follower counts.

5. Profiles should never display friend counts.

6. Profiles should never display popularity metrics.

7. Profiles should never display engagement scores.

8. Database is the source of truth.

9. Wallet information must remain private.

10. Historical participation must remain visible.

11. Friendships are created through Circle membership.

12. Users must not be able to view another user's friends.

13. Users must only see shared circles.

14. Users must only see shared plans.

15. The profile should help users answer:

"Who is this person in my social world?"

not

"How popular is this person?"

# Future Design For Profile

The Profile page is NOT a wallet page.

The Profile page is the user's story inside Planless.

Planless core loop:

Create Plan
→ Attend Plan
→ Create Memory
→ Build Personal History

The Profile should surface memories and participation first.

## MVP Sections

### Stats

* Plans Hosted
* Plans Attended
* Circles Joined
* Memories Created

### Movies

* Loved It count
* Good count
* Not For Me count

### Dining

* Would Return count
* Maybe count
* No count

### Football

* Matches Played
* MVP Awards Won

### Badminton

* Total Wins
* Total Losses
* MVP Awards Won

### Recent Memories

Examples:

Movie Night
Loved It

Dinner at XYZ
Would Return

Football
Won 4–2
MVP: Alex

Badminton
4W • 2L

## Principle

Profile should answer:

"What have I done on Planless?"

not

"What is my wallet balance?"

Wallet can come later.

Memories and personal history come first.

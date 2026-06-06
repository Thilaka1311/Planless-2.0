# FRIENDSHIP LIFECYCLE

## Purpose

Friendships exist to support real-world coordination.

Friendships are not follower systems.

Friendships are not popularity systems.

Friendships are not engagement systems.

The purpose of friendships is to make planning easier between people who share social groups.

---

# Core Philosophy

Planless is built around trusted social networks.

The primary social unit is the Circle.

Friendships are derived from shared Circle membership.

Users should not need to manually build social graphs.

The system should feel:

* automatic
* lightweight
* social
* effortless

---

# MVP Friendship Philosophy

For MVP:

Circles are the source of friendships.

Users do not:

* search for people
* send friend requests
* approve friend requests
* follow users

Friendships are created automatically through Circle membership.

---

# Account Creation Flow

Users create accounts using:

Email

↓

OTP Verification

↓

Account Created

Phone numbers are not required for MVP.

Database:

users

is the source of truth.

---

# Friendship Creation Flow

## Trigger

User joins a Circle.

### Result

The user automatically becomes friends with:

* Circle Admins
* Existing Circle Members

Friendships are created automatically.

No manual action is required.

---

# Existing Member Flow

When a new user joins a Circle:

Existing members automatically become friends with the new member.

### Result

Friendship graph remains synchronized with Circle membership.

---

# Friendship State

## FRIEND

Meaning:

* Users share at least one Circle.
* Users may coordinate plans together.
* Users may be selected during plan creation.
* Users appear within friend-based experiences.

Friendship is symmetric.

If:

User A

is friends with

User B

Then:

User B

is friends with

User A

---

# Circle Relationship Rules

Circles are the source of friendship creation.

### Joining a Circle

Creates friendships.

### Multiple Shared Circles

Do not create duplicate friendships.

Only one friendship relationship should exist between any two users.

---

# Leaving a Circle

Friendships should remain.

Reason:

Users may have coordinated together previously.

Historical social relationships should be preserved.

Leaving a Circle should only affect:

* future circle visibility
* future circle plan distribution

It should not remove friendships.

---

# Friend Visibility

Users may view:

* Friends
* Shared Circles
* Shared Plans

Friendships provide social context.

Not social status.

---

# Friend-Based Planning

During plan creation:

Hosts may select:

* Friends
* Circles
* Mixed audiences

Friendships make audience selection easier.

---

# Discovery Rules

Users discover people through:

* Circles
* Shared Plans
* Existing Friendships

Do NOT support:

* Global user search
* Public user discovery
* Recommended users
* Suggested creators
* Popular accounts

Planless is not a social network.

---

# Historical Preservation Rules

Friendships should remain even if:

* A user leaves a Circle
* A Circle is deleted

Historical coordination should remain intact.

Historical plans remain intact.

Historical memories remain intact.

---

# State Transitions

Create Account

↓

Verified User

Create Circle

↓

Member Added

↓

Friendships Created

Join Circle

↓

Friendships Created

New User Joins Circle

↓

Friendships Created With Existing Members

Leave Circle

↓

Friendships Remain

Delete Circle

↓

Friendships Remain

---

# Non-Negotiable Rules

1. Friendships exist to support coordination.

2. Circles are the primary friendship creation mechanism.

3. Joining a Circle automatically creates friendships.

4. No friend requests exist in MVP.

5. No follower system exists.

6. No following system exists.

7. No user search system exists.

8. No popularity systems exist.

9. Friendships are symmetric.

10. Duplicate friendships must never be created.

11. Leaving a Circle must not remove friendships.

12. Deleting a Circle must not remove friendships.

13. Database is the source of truth.

14. Friendships should help users answer:

"Who can I make plans with?"

not

"Who follows me?"

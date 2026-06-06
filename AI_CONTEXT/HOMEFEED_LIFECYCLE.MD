# HOME FEED LIFECYCLE

## Purpose

The Home Feed is the primary discovery surface of Planless.

The Home Feed exists to help users discover real-world opportunities happening within their social world.

It is not:

* a task manager
* a calendar
* a dashboard
* a plan archive

The Home Feed is a live stream of active plans available to the user.

---

# Core Philosophy

The Home Feed should feel like:

> "a live stream of real-world plans happening around your social world."

Every swipe should feel like:

> "Here's another thing I could do."

The Home Feed optimizes for:

* discovery
* spontaneity
* participation
* social awareness

The Home Feed does NOT optimize for:

* analytics
* management
* administration
* historical records

---

# Feed Structure

The feed uses:

* full-screen plan cards
* one card per viewport
* vertical swipe navigation
* snap scrolling
* mobile-first interactions

Only one plan should be visible at a time.

Users discover plans one-by-one.

---

# Eligible Plan Rules

A plan may appear in the Home Feed only if:

### Plan Status

ACTIVE

AND

### Participant Status

* DELIVERED
  OR
* SEEN

AND

User is eligible to see the plan.

The Home Feed is only for plans that have not yet received a participation decision.

---

# Plans That SHOULD Appear

Active plans that:

* are visible to the user
* belong to the user's circles
* belong to the user's social graph
* have participant status = DELIVERED
  OR
* have participant status = SEEN
* are not hosted by the user

The feed is for discovery.

Users may continue seeing plans they have already viewed (SEEN) until they Join, Skip, or enter a Waitlist.

---

# Plans That MUST NOT Appear

Do NOT show:

* Joined plans
* Skipped plans
* Waitlisted plans
* Hosted plans
* Cancelled plans
* Completed plans
* Historical plans

These belong elsewhere in the application.

---

# Plan Visibility States

## DELIVERED

Meaning:

* Plan has been distributed to the participant.
* User has not yet viewed the plan.
* User has not made a participation decision.

---

## SEEN

Meaning:

* User has viewed the plan.
* User has not yet made a participation decision.
* User remains eligible to Join, Skip, or Waitlist.

A plan transitions from:

DELIVERED

→ SEEN

when:

* The plan becomes visible in the Home Feed.
* The user opens the Plan Preview.
* The user views the plan from within a Circle.

SEEN is not a participation outcome.

SEEN simply tracks that the participant has viewed the plan.

---

# Feed Card Actions

Each card supports three primary interactions.

---

## Hold To Join

### Purpose

Fast participation.

User already knows they want to attend.

### Action

Hold card.

### If Capacity Exists

Database:

participant.status = JOIN

Effects:

* DELIVERED → JOIN
  OR
* SEEN → JOIN
* Plan removed from Home Feed
* Plan added to Going
* Attendance count updates
* Database sync occurs immediately

### If Plan Is Full

Conditions:

* waitlist_enabled = true

Database:

participant.status = WAITLIST

Effects:

* DELIVERED → WAITLIST
  OR
* SEEN → WAITLIST
* Plan removed from Home Feed
* Plan added to Waitlist
* User not counted as attendee
* Database sync occurs immediately

---

## Tap To Preview

### Purpose

View complete plan information before making a participation decision.

### Action

Tap card.

### Result

Open Plan Preview.

The Plan Preview is the primary decision surface for participation.

Users can review:

* Activity
* Host
* Attendees
* Circle
* Date & Time
* Venue
* Additional plan details

Users can then decide whether to Join, Skip, or enter the Waitlist.

---

## Swipe To Next Plan

### Purpose

Continue discovery.

### Action

Swipe vertically.

### Effects

* No database update
* No participation update
* No status change

### Important

Swiping is NOT skipping.

Swiping simply means:

> "Show me the next plan."

---

# Plan Preview Flow

## Purpose

Allow users to fully evaluate a plan before deciding how to participate.

The Plan Preview acts as the detailed view of a plan.

It should display:

* Activity
* Host
* Attendees
* Date & Time
* Venue
* Circle
* Additional plan information

Opening the Plan Preview should automatically transition:

DELIVERED

→ SEEN

if the participant has not previously viewed the plan.

Viewing a plan is not a participation action.

The participant remains eligible to Join, Skip, or Waitlist.

---

# Preview State: Pending

User has not responded yet.

### Available Participant States

* DELIVERED
* SEEN

### Available Actions

#### JOIN

If capacity exists:

Database:

participant.status = JOIN

Effects:

* Removed from Home Feed
* Added to Going
* Attendance count increases
* Database sync occurs immediately

#### JOIN WHEN PLAN IS FULL

Conditions:

* Plan has reached capacity
* waitlist_enabled = true

Database:

participant.status = WAITLIST

Effects:

* Removed from Home Feed
* Added to Waitlist
* User is not counted as attendee
* Database sync occurs immediately

#### SKIP

Database:

participant.status = SKIP

Effects:

* Removed from Home Feed
* Added to Passed
* Database sync occurs immediately

---

# Preview State: Going

User has already joined.

### Available Actions

#### SKIP PLAN

Database:

JOIN

→ SKIP

Effects:

* Removed from Going
* Added to Passed
* Attendance count decreases
* Database sync occurs immediately

---

# Preview State: Waitlist

User is currently waitlisted.

### Available Actions

#### LEAVE WAITLIST

Database:

WAITLIST

→ SKIP

Effects:

* Removed from Waitlist
* Added to Passed

#### AUTO PROMOTION

Trigger:

A participant leaves the plan.

Database:

WAITLIST

→ JOIN

Effects:

* Removed from Waitlist
* Added to Going
* Attendance count increases

---

# Preview State: Passed

User has previously skipped the plan.

### Available Actions

#### REJOIN PLAN

Conditions:

* Capacity available

Database:

SKIP

→ JOIN

Effects:

* Removed from Passed
* Added to Going
* Attendance count increases

#### REJOIN WAITLIST

Conditions:

* Plan is full
* waitlist_enabled = true

Database:

SKIP

→ WAITLIST

Effects:

* Removed from Passed
* Added to Waitlist

---

# Preview State: Host

User is the host of the plan.

### Available Actions

#### Change Host

Effects:

* Transfer host ownership
* Update host_id in database
* Previous host becomes a normal participant
* Database sync occurs immediately

#### Ditch Plan

Effects:

* Plan status becomes CANCELLED
* Plan removed from all active flows
* Database sync occurs immediately

---

# Preview Source Of Truth

The Plan Preview should derive its behavior from:

* participant status
* host status
* plan status

stored in the database.

The database is the source of truth.

---

# Feed Removal Rules

Immediately remove a plan from the Home Feed when:

* User joins
* User skips
* User enters Waitlist
* User becomes host
* Plan becomes cancelled
* Plan becomes completed

---

# Feed Refresh Rules

Refresh feed when:

* App opens
* User joins a plan
* User skips a plan
* User joins a waitlist
* User leaves a waitlist
* User rejoins a plan
* User rejoins a waitlist
* Plan is cancelled
* New plan becomes available

Database remains the source of truth.

---

# Ordering Rules (MVP)

Do NOT use a recommendation algorithm.

Order by:

1. Upcoming plans
2. Newest plans
3. Active plans only

Keep ordering predictable and simple.

---

# Social Context Rules

Every card should prioritize:

1. Activity
2. People
3. Timing
4. Venue
5. Secondary details

The activity remains the hero.

Social proof should be lightweight.

Use:

* attendee avatars
* attendee count
* circle familiarity
* friend familiarity

Avoid:

* popularity rankings
* engagement scores
* follower counts
* public leaderboards

---

# Navigation Rules

The feed is the hero surface.

Navigation should remain secondary.

Avoid:

* nested scrolling
* complex filtering
* heavy dashboards
* overloaded tabs

The primary action should always be:

> Swipe to discover.

---

# State Transitions

Plan Available

→ DELIVERED

DELIVERED

→ SEEN

SEEN

→ Home Feed

Home Feed

→ Hold To Join

→ Going

Home Feed

→ Hold To Join (Full Plan)

→ Waitlist

Home Feed

→ Tap Preview

→ Preview

Preview

→ Join

→ Going

Preview

→ Join (Full Plan)

→ Waitlist

Preview

→ Skip

→ Passed

Going

→ Skip Plan

→ Passed

Waitlist

→ Leave Waitlist

→ Passed

Waitlist

→ Auto Promotion

→ Going

Passed

→ Rejoin Plan

→ Going

Passed

→ Rejoin Waitlist

→ Waitlist

Host

→ Change Host

→ Normal Participant

Host

→ Ditch Plan

→ Cancelled

Plan Cancelled

→ Removed From Feed

Plan Completed

→ Removed From Feed

---

# Non-Negotiable Rules

1. The Home Feed is a discovery surface.

2. One plan per screen.

3. Swiping is not skipping.

4. Joining removes the plan from the feed.

5. Skipping removes the plan from the feed.

6. Entering a waitlist removes the plan from the feed.

7. Hosted plans never appear in the feed.

8. Joined plans never appear in the feed.

9. Passed plans never appear in the feed.

10. Waitlisted plans never appear in the feed.

11. Cancelled plans never appear in the feed.

12. Completed plans never appear in the feed.

13. Database is the source of truth.

14. The Plan Preview is the primary decision surface.

15. All participation actions must persist to the database.

16. All host actions must persist to the database.

17. The feed should always answer:

"What can I do next?"

18. DELIVERED and SEEN are visibility states, not participation states.

19. Viewing a plan from the Home Feed, Plan Preview, or Circle should transition DELIVERED → SEEN.

20. Valid participation outcomes are JOIN, SKIP, and WAITLIST.

21. Plans with DELIVERED or SEEN status may appear in the Home Feed.

22. Plans with JOIN, SKIP, or WAITLIST status must not appear in the Home Feed.

23. Waitlisted users are not counted as attendees.

24. Automatic promotion should occur when attendee capacity becomes available.

25. Database remains the source of truth for waitlist order and promotion state.

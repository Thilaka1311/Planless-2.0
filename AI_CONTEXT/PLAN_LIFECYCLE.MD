# PLAN LIFECYCLE

## Purpose

The Plan Lifecycle defines how users interact with plans from creation through participation, waitlisting, skipping, rejoining, completion, host transfer, and cancellation.

This document is the single source of truth for all plan-related behavior in Planless.

---

# Core Philosophy

Planless is designed around real-world social coordination.

Plans should feel:

* lightweight
* spontaneous
* social
* human
* easy to join
* easy to leave

The system should minimize complexity while keeping state transitions predictable.

---

# Participant Statuses

Five participant statuses exist in the database.

## DELIVERED

Meaning:

* Plan has been delivered to the user.
* User has not yet viewed the plan.
* User has not taken any RSVP action.

---

## SEEN

Meaning:

* User has viewed the plan.
* User has not yet taken any RSVP action.
* User is still deciding.

### Trigger

* Plan card becomes visible in the Home Feed.
* User opens the Plan Preview.
* User views the plan from within a Circle.

### State Transition

DELIVERED

→ SEEN

---

## JOIN

Meaning:

* User is attending the plan.
* User appears in Going.
* User is counted as an attendee.

---

## SKIP

Meaning:

* User is not attending the plan.
* User appears in Passed.
* User is not counted as an attendee.

---

## WAITLIST

Meaning:

* User wants to attend the plan.
* The plan is currently full.
* No attendee spots are available.
* User appears in Waitlist.
* User is not counted as an attendee.

Users may be automatically promoted to JOIN when a spot becomes available.

---

# Plan Statuses

## ACTIVE

Plan is available and operational.

Users can:

* Join
* Skip
* Rejoin
* Waitlist
* Transfer host
* View plan

---

## CANCELLED

Plan has been ditched by the host.

Users cannot:

* Join
* Skip
* Rejoin
* Waitlist
* Transfer host

Cancelled plans should disappear from active user flows.

---

## COMPLETED

Plan has ended.

Users cannot:

* Join
* Skip
* Rejoin
* Waitlist
* Transfer host

Completed plans become historical records.

---

# Plan Creation Flow

### Trigger

Host creates a plan.

### Result

* Plan status = ACTIVE
* Host becomes plan host
* Host participant status = JOIN
* Invited users receive the plan
* Invited users receive participant status = DELIVERED

Plan becomes visible to eligible users.

---

# Discovery Flow

User receives a plan.

### Initial State

DELIVERED

### Visibility Tracking

When the plan becomes visible in the Home Feed:

DELIVERED

→ SEEN

When the user opens the Plan Preview:

DELIVERED

→ SEEN

When the user views the plan from within a Circle:

DELIVERED

→ SEEN

### Effects

* User has acknowledged the plan exists.
* No RSVP decision has been made yet.

---

# Pending Invite Flow

User has not yet responded.

### Available States

* DELIVERED
* SEEN

---

## JOIN

### If Capacity Exists

Participant Status:

JOIN

### Effects

* Removed from discovery flow
* Added to Going
* Counted as attendee

---

## JOIN When Plan Is Full

### Conditions

* Plan has reached capacity
* waitlist_enabled = true

Participant Status:

WAITLIST

### Effects

* Removed from discovery flow
* Added to Waitlist
* Not counted as attendee

---

## SKIP

Participant Status:

SKIP

### Effects

* Removed from discovery flow
* Added to Passed
* Not counted as attendee

---

# Going Flow

User has joined the plan.

---

## View Plan

User can open plan details.

---

## Skip Plan

### UI Label

SKIP PLAN

### Database

JOIN

→ SKIP

### Effects

* Removed from Going
* Added to Passed
* Attendee count decreases

---

# Passed Flow

User previously skipped the plan.

---

## Rejoin Plan

### Conditions

* Plan has available capacity

### UI Label

REJOIN PLAN

### Database

SKIP

→ JOIN

### Effects

* Removed from Passed
* Added to Going
* Attendee count increases

---

## Rejoin Waitlist

### Conditions

* Plan is full
* waitlist_enabled = true

### UI Label

REJOIN WAITLIST

### Database

SKIP

→ WAITLIST

### Effects

* Removed from Passed
* Added to Waitlist

---

# Waitlist Flow

User attempted to join a plan that has reached capacity.

### Conditions

* Plan is full
* waitlist_enabled = true

### Database

SEEN

→ WAITLIST

### Effects

* User appears in Waitlist
* User is not counted as an attendee
* User remains eligible for promotion

---

## Leave Waitlist

### UI Label

LEAVE WAITLIST

### Database

WAITLIST

→ SKIP

### Effects

* Removed from Waitlist
* Added to Passed

---

## Automatic Promotion

### Trigger

A confirmed attendee leaves the plan.

Examples:

* JOIN → SKIP
* Host removes attendee
* Participant leaves plan

### Promotion Rule

The first waitlisted user is promoted automatically.

### Priority

joined_at ASC

First Come, First Served.

### Database

WAITLIST

→ JOIN

### Effects

* Removed from Waitlist
* Added to Going
* Attendee count increases

---

## Full Plan Without Waitlist

### Conditions

* Plan is full
* waitlist_enabled = false

### Result

* Join action is disabled
* User cannot enter Waitlist
* User may only Skip the plan

---

# Home Feed Behavior

The Home Feed is a discovery surface.

It should only contain plans that the user has not yet acted upon.

### Show

* Active plans
* Eligible plans
* Plans with status DELIVERED
* Plans with status SEEN

### Do Not Show

* Joined plans
* Skipped plans
* Waitlisted plans
* Hosted plans
* Cancelled plans
* Completed plans

Home Feed exists for discovery only.

---

# Host Actions

Hosts have additional controls.

---

## Change Host

### Purpose

Transfer ownership of a plan.

### Requirements

* New host must be persisted to database.
* host_id must update successfully.
* Previous host loses host privileges.
* New host gains host privileges.
* Changes must survive app restart.

### After Transfer

The previous host becomes a normal participant.

They now follow the standard RSVP lifecycle.

---

## Ditch Plan

### Purpose

Cancel the plan entirely.

Confirmation required.

### Database

plan.status = CANCELLED

### Effects

* Plan removed from Home Feed
* Plan removed from Going
* Plan removed from Passed
* Plan removed from Waitlist
* Plan removed from active flows
* No further RSVP actions allowed

Changes must survive refresh and app restart.

---

# Completion Flow

### Trigger

Plan end time is reached.

### Database

plan.status = COMPLETED

### Effects

* Plan becomes read-only
* No RSVP changes allowed
* No host changes allowed
* Waitlisted users are not counted as attendees
* Plan moves into historical records

---

# Attendance Rules

## JOIN

* Increase attendee count

## SKIP

* Decrease attendee count

## WAITLIST

* Does not affect attendee count

## REJOIN

* Increase attendee count

## SKIP PLAN

* Decrease attendee count

Attendance counts must always be calculated from participant statuses stored in the database.

Database is the source of truth.

---

# State Transitions

DELIVERED

→ SEEN

SEEN

→ JOIN

→ Going

SEEN

→ SKIP

→ Passed

SEEN

→ WAITLIST

→ Waitlist

Going

→ SKIP PLAN

→ Passed

Passed

→ REJOIN PLAN

→ Going

Passed

→ REJOIN WAITLIST

→ Waitlist

Waitlist

→ LEAVE WAITLIST

→ Passed

Waitlist

→ AUTO PROMOTION

→ Going

Host

→ Change Host

→ Normal Participant

Active Plan

→ Ditch Plan

→ Cancelled

Active Plan

→ End Time Reached

→ Completed

---

# Non-Negotiable Rules

1. Database is the source of truth.

2. UI state must never be considered authoritative.

3. Every RSVP action must persist to the database.

4. Every host action must persist to the database.

5. Refreshing or restarting the app must preserve all plan state.

6. Only DELIVERED, SEEN, JOIN, SKIP, and WAITLIST participant statuses should exist.

7. PlansContext must refresh after successful state changes.

8. All screens must derive behavior from the same participant status values.

9. Cancelled plans must not appear in active flows.

10. Completed plans must not accept further participation changes.

11. Viewing a plan should transition DELIVERED → SEEN.

12. SEEN is not an RSVP decision.

13. JOIN, SKIP, and WAITLIST are the only participation outcomes.

14. Waitlisted users are not counted as attendees.

15. Waitlist promotion must use joined_at ASC ordering.

16. Automatic promotion should occur when attendee capacity becomes available.

17. Database remains the source of truth for waitlist order and promotion state.

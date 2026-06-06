# DATABASE

## Purpose

This document defines the database source of truth for Planless.

All application behavior must derive from the database.

The database is authoritative.

UI state, local state, cached state, and derived state are never authoritative.

If the UI and database disagree:

The database is correct.

---

# Core Database Philosophy

Planless is a database-driven application.

All business logic should ultimately resolve to database state.

Examples:

* Plan participation
* Waitlist order
* Host ownership
* Circle membership
* Plan visibility
* Attendance counts

must all be derived from database records.

Never derive critical business state exclusively from the UI.

---

# Core MVP Tables

The following tables power the core Planless experience:

## Users

```text
users
```

Stores:

* identity
* profile data
* wallet balance
* account metadata

---

## Friendships

```text
friendships
```

Stores:

* social graph
* friendship relationships

---

## Circles

```text
circles
```

Stores:

* social groups
* planning groups

---

## Circle Members

```text
circle_members
```

Stores:

* membership
* circle roles

---

## Plans

```text
plans
```

Stores:

* plan metadata
* plan ownership
* scheduling information

---

## Plan Participants

```text
plan_participants
```

Stores:

* participation state
* visibility state
* waitlist state

This is one of the most important tables in the system.

---

## Transactions

```text
transactions
```

Stores:

* payments
* settlements
* wallet activity

---

## Memories

```text
memories
```

Stores:

* media uploaded to plans
* historical content

---

# Secondary Tables

These tables are not part of the core planning loop.

```text
notifications
plan_reminders
user_stats
user_data
```

These should not be used as sources of truth for planning behavior.

---

# Participant Statuses

The Planless participation system supports five statuses.

## delivered

Meaning:

* Plan delivered
* User has not viewed the plan

---

## seen

Meaning:

* User viewed the plan
* No participation decision made

---

## going

Business Meaning:

JOIN

Meaning:

* User is attending
* Counted as attendee

---

## skipped

Business Meaning:

SKIP

Meaning:

* User is not attending

---

## waitlist

Business Meaning:

WAITLIST

Meaning:

* User wants to attend
* No capacity available

---

# Valid Participant State Transitions

```text
delivered
    ↓
seen
  ↙ ↓ ↘
going skipped waitlist

waitlist
    ↓
going

waitlist
    ↓
skipped

skipped
    ↓
going

skipped
    ↓
waitlist
```

No other transitions should exist.

---

# Plan Statuses

## active

Plan is operational.

---

## cancelled

Plan has been ditched.

---

## completed

Plan has ended.

---

# Circle Roles

Valid roles:

```text
admin
member
```

No other roles should be introduced.

Do not create:

* owner
* moderator
* super_admin

---

# Plan Visibility Rules

Plans appear in Home Feed only when:

```text
participant.status IN
(
  delivered,
  seen
)
```

AND

```text
plan.status = active
```

---

# Going Rules

Users appear in Going when:

```text
participant.status = going
```

---

# Passed Rules

Users appear in Passed when:

```text
participant.status = skipped
```

---

# Waitlist Rules

Users appear in Waitlist when:

```text
participant.status = waitlist
```

Waitlisted users:

* are not attendees
* are not counted toward capacity

---

# Attendance Rules

Attendee count must be derived from:

```text
participant.status = going
```

Only.

Never count:

```text
waitlist
skipped
delivered
seen
```

---

# Waitlist Promotion Rules

Promotion order:

```text
joined_at ASC
```

First Come First Served.

When capacity becomes available:

```text
waitlist
→
going
```

for the oldest eligible waitlisted participant.

---

# Circle Membership Rules

Future plan visibility is determined by:

```text
circle_members
```

Only current members receive future circle plans.

Historical participation must remain intact after leaving a circle.

---

# Circle Deletion Rules

Deleting a circle:

* removes the circle
* removes memberships

Deleting a circle must NOT:

* delete plans
* delete participation history
* delete memories
* delete transactions

Historical records must survive.

---

# Database Invariants

The following must always be true:

1. Database is the source of truth.

2. One participant record per user per plan.

3. Participant state must exist in plan_participants.

4. Attendance count must derive from participant state.

5. Circle membership determines future visibility.

6. Historical participation must never be deleted.

7. Historical plans must never be deleted when a circle is deleted.

8. Waitlist ordering must be deterministic.

9. Refreshing the application must reproduce the same state from the database.

10. UI state must never override persisted database state.

---

# AI Rules

When modifying Planless:

* Never invent new participant statuses.
* Never invent new plan statuses.
* Never invent new circle roles.
* Never use UI state as a source of truth.
* Always update database state before updating UI state.
* Always refresh application state after successful mutations.
* Respect all lifecycle documents in AI_CONTEXT.

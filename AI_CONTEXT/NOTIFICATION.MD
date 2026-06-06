# NOTIFICATION LIFECYCLE

## Purpose

Notifications exist to support real-world coordination.

Notifications are not content.

Notifications are not engagement tools.

Notifications are not growth mechanics.

The purpose of notifications is to help users:

* discover plans
* respond to plans
* coordinate participation
* complete time-sensitive actions

Notifications should always feel useful.

Never noisy.

---

# Core Philosophy

Notifications should feel:

* lightweight
* timely
* relevant
* actionable
* socially meaningful

Notifications should never feel:

* spammy
* addictive
* promotional
* algorithmic
* engagement-driven

A notification should answer:

> "What do I need to know right now?"

---

# Notification Types

## Plan Invitation

### Trigger

User receives a plan.

### Result

Notification created.

### Purpose

Inform the user that a new plan is available.

### Example

"Navin invited you to Football Tonight."

---

## Plan Reminder

### Trigger

Upcoming plan is approaching.

### Suggested Timing

* 24 hours before
* 2 hours before
* 30 minutes before

### Purpose

Help users remember commitments.

### Example

"Football Tonight starts in 2 hours."

---

## Waitlist Promotion

### Trigger

WAITLIST

↓

JOIN

### Result

Notification created.

### Purpose

Inform the user that a spot is now available.

### Example

"A spot opened up for Football Tonight."

---

## Host Transfer

### Trigger

Host changes ownership.

### Purpose

Inform the new host.

### Example

"You are now hosting Football Tonight."

---

## Circle Addition

### Trigger

Admin adds user to a Circle.

### Purpose

Inform the user.

### Example

"You were added to Weekend Football."

---

## Payment Required

### Trigger

User secures a spot in a paid plan.

### Purpose

Prompt payment completion.

### Example

"Payment required to confirm your spot."

---

## Payment Confirmed

### Trigger

Payment successful.

### Purpose

Provide confirmation.

### Example

"Your payment has been confirmed."

---

## Plan Cancelled

### Trigger

ACTIVE

↓

CANCELLED

### Purpose

Inform affected participants.

### Example

"Football Tonight has been cancelled."

---

## Plan Completed

### Trigger

ACTIVE

↓

COMPLETED

### Purpose

Move users toward memories.

### Example

"Football Tonight is complete. Add memories?"

---

# Notification Delivery Rules

Notifications should only be created for meaningful actions.

Avoid notifications for:

* viewing plans
* opening circles
* opening profiles
* browsing content

Notifications should only exist when user action may be required.

---

# Notification Priority Levels

## High Priority

Requires user action.

Examples:

* Plan invitation
* Waitlist promotion
* Payment required
* Plan cancellation

---

## Medium Priority

Helpful reminders.

Examples:

* Upcoming plan reminders
* Host transfer
* Circle addition

---

## Low Priority

Informational.

Examples:

* Payment confirmation
* Plan completion

---

# Notification Read Flow

Initial State:

UNREAD

User opens notification.

Result:

READ

Database:

is_read = true

Notifications should never be deleted automatically because they serve as historical coordination records.

---

# Notification Retention Rules

Notifications should remain visible until:

* user clears them
  OR
* retention policy removes old notifications

Notifications should not disappear immediately after being read.

---

# Notification UI Rules

Notifications should be:

* concise
* human
* readable
* action-oriented

Avoid:

* corporate language
* system jargon
* technical descriptions

Good:

"Movie Night starts in 2 hours."

Bad:

"Your scheduled event is approaching."

---

# Notification Feed Rules

The notification center is not a social feed.

Do not show:

* popularity metrics
* engagement counts
* recommendation cards
* promotional content

Only show:

* coordination updates
* participation updates
* payment updates
* circle updates

---

# Database Rules

Source Table:

notifications

Minimum Fields:

* user_id
* type
* title
* body
* reference_id
* is_read
* created_at

Database is the source of truth.

Notification state should never exist only in UI memory.

---

# State Transitions

Notification Created

↓

UNREAD

UNREAD

↓

READ

READ

↓

Archived By User (Optional)

---

# Non-Negotiable Rules

1. Notifications exist to support coordination.

2. Notifications are not engagement tools.

3. Notifications should never feel spammy.

4. Every notification must be tied to a real user action or system event.

5. Notification content should be concise and human.

6. Database is the source of truth.

7. Opening a notification should mark it as READ.

8. Notifications should not contain promotional content.

9. The notification center is not a social feed.

10. Every notification should help a user take action or stay informed about a real-world plan.

11. Notifications should always feel like:

"I should know this."

not

"Come back to the app."

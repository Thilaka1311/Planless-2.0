# NOTIFICATION_TYPES.md

# Planless 2.0 Notification Architecture

## Philosophy

Notifications are coordination events.

Notifications are not content.

Notifications are not social engagement.

Notifications exist only when a user needs to know that something changed in a plan or circle.

Source of truth:

Lifecycle Event
↓
Notification Record
↓
UI

Notifications never create business state.

Notifications only communicate business state.

---

# Notification Priorities

## Critical

Requires immediate awareness.

Examples:

* New invitation
* Waitlist promotion
* Plan cancellation

---

## Important

User should know soon.

Examples:

* Plan updated
* Host transferred
* Participant joined
* Participant skipped

---

# Participant Notifications

## PLAN_INVITATION

### Trigger

Host creates a plan.

### Recipient

Invited participant.

### Reference

plan_id

### Priority

Critical

### Deep Link

Plan Preview

### Example

"You're invited to Footie Sunday."

---

## WAITLIST_PROMOTED

### Trigger

Participant promoted from waitlist to confirmed.

### Recipient

Promoted participant.

### Reference

plan_id

### Priority

Critical

### Deep Link

Plan Preview

### Example

"A spot opened up. You're now in for Footie Sunday."

---

## PLAN_CANCELLED

### Trigger

Plan status:

active
→
cancelled

### Recipient

All participants except host.

### Reference

plan_id

### Priority

Critical

### Deep Link

Plan Preview

### Example

"Footie Sunday has been cancelled."

---

## PLAN_UPDATED

### Trigger

Host changes:

* date
* time
* venue
* title
* participant limit

### Recipient

All participants except host.

### Reference

plan_id

### Priority

Important

### Deep Link

Plan Preview

### Example

"Footie Sunday has been updated."

---

## HOST_TRANSFERRED

### Trigger

plans.host_id changes.

### Recipient

New host.

### Reference

plan_id

### Priority

Important

### Deep Link

Plan Preview

### Example

"You are now the host of Footie Sunday."

---

# Host Notifications

## PARTICIPANT_JOINED

### Trigger

Participant status changes to:

going

### Recipient

Plan host.

### Reference

plan_id

### Priority

Important

### Deep Link

Plan Preview

### Example

"Rahul joined Footie Sunday."

### Notes

Only create when participant successfully becomes going.

Do not create for:

* delivered
* seen
* waitlist

Host should only be notified when attendance is confirmed.

---

## PARTICIPANT_SKIPPED

### Trigger

Participant status changes to:

skipped

### Recipient

Plan host.

### Reference

plan_id

### Priority

Important

### Deep Link

Plan Preview

### Example

"Rahul can no longer make it to Footie Sunday."

### Notes

Only create when a participant leaves a confirmed spot or explicitly skips the plan.

Useful for attendance management and waitlist promotion awareness.

---

# Explicitly Unsupported

The following notification types do not belong in Planless:

* FRIEND_REQUEST
* FRIEND_ACCEPTED
* FOLLOWED_YOU
* COMMENTED_ON_POST
* LIKED_POST
* REACTION_ADDED
* MENTIONED_YOU

Reason:

Planless is a coordination platform, not a social network.

---

# V0 Launch Scope

Implement before launch:

1. PLAN_INVITATION
2. WAITLIST_PROMOTED
3. PLAN_CANCELLED
4. PLAN_UPDATED
5. HOST_TRANSFERRED
6. PARTICIPANT_JOINED
7. PARTICIPANT_SKIPPED

These notifications cover the complete coordination lifecycle for both participants and hosts in Planless V0.

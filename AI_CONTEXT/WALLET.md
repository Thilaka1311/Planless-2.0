# WALLET & PAYMENT LIFECYCLE

## Purpose

The Wallet & Payment system exists to reduce coordination friction inside plans.

Payments are not the product.

Plans are the product.

Payments exist only to make plans easier to organize, commit to, and execute.

The Wallet system should always feel secondary to participation.

---

# Core Philosophy

Payments should feel:

* lightweight
* fast
* social
* invisible
* trustworthy

The system should never feel:

* like a banking application
* like a fintech product
* like accounting software
* like debt-tracking software

The purpose of payments is:

* split costs
* reserve participation
* improve commitment
* reduce drop-offs

---

# Payment States

## UNPAID

Meaning:

* Payment is required.
* User has not completed payment.

User may:

* View payment details.
* Pay now.

---

## PAID

Meaning:

* Payment completed successfully.
* Participation is confirmed.

User may:

* View payment receipt.
* Participate normally.

---

# Plan Payment Types

## No Payment Required

Default state.

Meaning:

* Plan participation is free.
* No transaction required.

Users may:

* Join
* Skip
* Waitlist

without payment.

---

## Split Payment Required

Host specifies:

* split_amount

Meaning:

* Participation requires payment.
* Cost is shared among attendees.

---

# Plan Creation Payment Flow

Host creates a plan.

### Payment Disabled

payment_required = false

Result:

* Plan published normally.
* Users may join immediately.

---

### Payment Enabled

payment_required = true

split_amount > 0

Result:

* Plan published.
* Payment requirement attached.
* Participants must pay before participation is confirmed.

---

# Join With Payment Flow

## Trigger

User selects JOIN.

Conditions:

* payment_required = true

### Result

User enters payment flow.

---

## Successful Payment

Transaction:

CREATED

↓

COMPLETED

Participant Status:

JOIN

Payment Status:

PAID

### Effects

* User added to Going.
* User counted as attendee.
* Transaction recorded.
* Wallet updated.

---

## Failed Payment

Participant Status:

Remains unchanged.

Payment Status:

UNPAID

### Effects

* User not added to Going.
* No attendee slot reserved.
* No transaction recorded.

---

# Waitlist Payment Rules

Users on the waitlist should never be charged.

Participant Status:

WAITLIST

### Meaning

* User has not secured a spot.
* User is not yet participating.

### Rules

Do NOT collect payment while waitlisted.

Payment should occur only after promotion.

---

# Waitlist Promotion Flow

Trigger:

WAITLIST

↓

JOIN

### If Payment Required

User receives payment request.

Participant Status:

Pending JOIN

Payment Status:

UNPAID

### Successful Payment

Payment Status:

PAID

Participant Status:

JOIN

### Failed Payment

Participant remains:

WAITLIST

The attendee slot should move to the next eligible waitlisted participant.

---

# Transaction Creation Flow

Every successful payment creates:

Transaction Record

Stored in:

transactions

Required Fields:

* sender_id
* receiver_id
* plan_id
* amount
* status
* created_at

---

# Wallet Balance Rules

Wallet balance is a convenience layer.

The source of truth remains:

transactions

Wallet balances should always be derivable from transaction history.

---

# Transaction History Rules

Every transaction should display:

* Plan
* Amount
* Status
* Date
* Participants involved

Transaction history should remain:

* simple
* readable
* plan-focused

---

# Refund Flow

## Trigger

Plan Status:

ACTIVE

↓

CANCELLED

### Conditions

* Payment was previously completed.

### Result

Refund transaction created.

Transaction Status:

REFUNDED

Wallet balance updated.

---

# Circle Payment Rules

Payments belong to plans.

Payments do not belong to circles.

Circles are simply distribution mechanisms.

All payment relationships should ultimately resolve to:

Plan

↓

Transaction

↓

Participant

---

# Attendance Rules

Only users with:

Participant Status:

JOIN

should be counted as attendees.

Do not count:

* DELIVERED
* SEEN
* SKIP
* WAITLIST

Payment status does not affect attendee counting once JOIN is confirmed.

---

# State Transitions

No Payment Required

↓

JOIN

Payment Required

↓

UNPAID

UNPAID

↓

PAID

PAID

↓

JOIN

WAITLIST

↓

PROMOTED

PROMOTED

↓

UNPAID

UNPAID

↓

PAID

PAID

↓

JOIN

ACTIVE PLAN

↓

CANCELLED

CANCELLED

↓

REFUND

---

# Non-Negotiable Rules

1. Payments exist to support plans.

2. Payments must never dominate the user experience.

3. Waitlisted users must never be charged.

4. Payment should occur only after a participant secures a spot.

5. Transactions are the source of truth for wallet balances.

6. All successful payments must create transaction records.

7. Refunds must be transaction-based.

8. Wallets should remain lightweight and utility-focused.

9. Transaction history should always be linked to plans.

10. The emotional feeling of payments should be:

"This makes the plan easier to happen."

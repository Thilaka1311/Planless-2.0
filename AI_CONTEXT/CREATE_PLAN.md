# CREATE PLAN LIFECYCLE

## Purpose

The Create Plan flow is one of the core experiences of Planless.

Creating a plan is the act of creating a real-world opportunity for people to coordinate, participate, and create memories together.

Every plan created should eventually move through:

Discovery

→ Participation

→ Experience

→ Memory

The Create Plan flow exists to make that process effortless.

---

# Core Philosophy

Creating a plan should feel:

* fast
* lightweight
* social
* exciting
* effortless

The Create Plan experience should never feel:

* administrative
* corporate
* form-heavy
* overwhelming
* like event management software

A user should be able to create and publish a plan in under 30 seconds whenever possible.

The Create Plan experience should feel:

> "Let's do something."

not

> "Configure an event."

---

# Create Plan Outcome

Publishing a plan creates:

* a Plan record
* participant records
* plan visibility records

The database becomes the source of truth immediately.

---

# Plan Creation State

When a plan is successfully published:

Plan Status:

ACTIVE

Host:

Current user becomes Host.

Participant Status:

Host receives:

JOIN

Invited users receive:

DELIVERED

The plan immediately becomes eligible for distribution.

---

# Speed & Simplicity Rules

The Create Plan flow should minimize:

* typing
* setup friction
* unnecessary fields
* excessive decision making

The flow should prioritize:

* speed
* clarity
* social coordination
* emotional excitement

over:

* customization depth
* advanced settings
* feature complexity

Every screen in the flow should reduce cognitive load.

---

# Plan Creation Flow

## Step 1: Select Experience

The first step should prioritize:

* suggested experiences
* visual discovery
* low-friction interaction
* quick selection

Suggested categories:

* Movies
* Sports
* Table Booking

Custom Plans must always exist as a first-class option.

Users should never be forced into predefined templates.

---

## Step 2: Configure Plan

Required Fields:

* Activity
* Date
* Time
* Venue
* Circle or People

Optional Fields:

* Notes
* Description
* Split Amount
* Cover Image

Optional fields must never block publishing.

---

## Step 3: Select Audience

Plans may be distributed to:

* Circles
* Friends
* Mixed Groups

The selection experience should prioritize:

* circles
* recurring groups
* trusted social connections

Avoid:

* permissions systems
* approval workflows
* complex invite management

---

## Step 4: Capacity Settings

Capacity is optional.

Hosts may choose:

### Unlimited Capacity

Anyone invited may join.

---

### Limited Capacity

Host specifies:

max_people

If capacity is reached:

Users may enter WAITLIST when:

waitlist_enabled = true

Users may not join when:

waitlist_enabled = false

---

## Step 5: Publish Plan

Publishing creates:

Plan Record

↓

Participant Records

↓

Visibility Distribution

↓

Home Feed Eligibility

The plan becomes immediately available to eligible participants.

---

# Circle Integration Rules

Circles are first-class planning units.

Creating a plan inside a circle:

* distributes the plan to circle members
* creates participant records
* assigns DELIVERED status to eligible members

Circle membership determines future plan visibility.

---

# Distribution Rules

Publishing a plan distributes it to eligible participants.

Participant Status:

DELIVERED

Meaning:

* Plan has been delivered
* User has not viewed it
* User has not responded

The plan enters the Home Feed discovery system.

---

# Waitlist Rules

If:

* max_people is reached
* waitlist_enabled = true

Users may join the waitlist.

Participant Status:

WAITLIST

Waitlisted users:

* are not attendees
* are not counted toward capacity
* may be automatically promoted

Promotion order:

joined_at ASC

First Come, First Served.

---

# Payment Rules

Split payments remain:

* optional
* lightweight
* secondary

Payments should never dominate plan creation.

The plan is more important than the payment.

---

# Interaction & Motion Rules

The Create Plan flow should feel:

* mobile-first
* thumb-friendly
* responsive
* native-feeling

Motion should remain:

* subtle
* smooth
* functional

Avoid:

* excessive animation
* cinematic transitions
* distracting motion systems

---

# CTA Rules

CTA buttons should remain:

* clean
* text-first
* minimal

Preferred examples:

* Continue
* Next
* Publish Plan
* Host Plan

Avoid:

* emoji buttons
* flashy fintech actions
* oversized glowing CTAs

---

# Visual & Emotional Rules

The Create Plan flow should feel:

* socially alive
* warm
* approachable
* exciting

not:

* intimidating
* over-designed
* operationally heavy

The final emotional feeling should be:

> "This is easy. Let's make it happen."

---

# Non-Negotiable Rules

1. Plan creation must be completable in under 30 seconds whenever possible.

2. Publishing a plan must create database records immediately.

3. Database becomes the source of truth after publishing.

4. Host receives JOIN status automatically.

5. Invited users receive DELIVERED status automatically.

6. Circles are first-class planning units.

7. Optional fields must never block publishing.

8. Waitlists must respect joined_at ASC ordering.

9. Home Feed distribution begins immediately after publishing.

10. The Create Plan flow should always optimize for speed over complexity.

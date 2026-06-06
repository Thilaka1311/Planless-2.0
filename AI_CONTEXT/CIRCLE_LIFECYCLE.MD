# CIRCLE LIFECYCLE

## Purpose

The Circle Lifecycle defines how social groups are created, managed, and used for real-world coordination inside Planless.

Circles are not communities, audiences, or follower groups.

A Circle is simply a real-world group of people who regularly make plans together.

### Examples

* Football Group
* College Friends
* Startup Friends
* Weekend Brunch Crew
* Running Club
* Flatmates

Circles exist to make planning easier.

---

# Core Philosophy

Circles should feel:

* intimate
* trusted
* lightweight
* social
* real-world

Circles are not designed to become:

* social networks
* content communities
* creator groups
* public forums

The purpose of a Circle is:

> make it easier to coordinate plans with people you already know.

---

# Circle States

## ACTIVE

Default state.

Circle can:

* create plans
* receive plans
* add members
* participate normally

---

# Membership Roles

## ADMIN

Circle administrators manage the group.

Can:

* invite/add members
* remove members
* transfer admin rights
* delete the circle
* create plans

A circle can have multiple admins.

---

## MEMBER

Standard participant.

Can:

* receive plans
* join plans
* skip plans
* join waitlists
* participate in circle activities
* leave the circle

Cannot:

* add members
* remove members
* delete the circle
* manage admins

---

# Circle Creation Flow

## Trigger

User creates a circle.

### Required

* Circle name

### Result

* Circle created
* Creator becomes first Admin
* Circle becomes Active

Creator is automatically added as a member.

---

# Member Addition Flow

Admins can directly add users to a circle.

No approval is required.

### Flow

Admin

→ Add User

→ User becomes Member

### Effects

* User immediately becomes a member.
* User gains access to future circle plans.
* User gains visibility into the circle.

This should feel lightweight and frictionless.

---

# Member Leave Flow

A member can leave a circle at any time.

Confirmation required.

### Effects

* User removed from membership.
* Future circle plans no longer appear.
* Historical participation remains intact.

Leaving a circle does not affect past plans.

---

# Remove Member Flow

Admin removes a member.

### Effects

* Member removed immediately.
* Future circle plans no longer appear.
* Historical participation remains intact.

Database must update immediately.

---

# Admin Transfer Flow

## Purpose

Transfer admin privileges.

### Requirements

* New admin must already be a member.

### Effects

* Selected member becomes Admin.
* Existing Admins remain Admins unless explicitly removed.

Changes must persist to the database.

---

# Circle Plan Distribution

When a plan is created for a circle:

Circle

→ Receives Plan

Eligible members can:

* View plan
* Join plan
* Skip plan
* Rejoin plan
* Join waitlist
* Leave waitlist
* Rejoin waitlist

Circle membership determines visibility.

Only current members should receive future plans.

---

# Circle Plan Visibility Tracking

When a plan is distributed to members of a circle:

## Initial Participant State

DELIVERED

### Meaning

* The plan has been distributed to the member.
* The member has not yet viewed the plan.
* No RSVP decision has been made.

---

A plan should transition from:

DELIVERED

→ SEEN

when either of the following occurs:

* The plan becomes visible in the Home Feed.
* The member opens the Circle and views the plan from within the Circle.
* The member opens the Plan Preview.

### Effects

* The member has acknowledged the plan exists.
* No RSVP decision has been made yet.
* The user remains eligible to participate.

SEEN is not an RSVP state.

SEEN simply indicates that the plan has been viewed by the participant.

---

# Circle Participation States

Circle-distributed plans follow the global Plan Lifecycle.

Valid participant states are:

* DELIVERED
* SEEN
* JOIN
* SKIP
* WAITLIST

---

# Waitlist Participation

A member enters the waitlist when:

* The plan is full.
* waitlist_enabled = true.
* The member attempts to join.

### State Transition

SEEN

→ WAITLIST

### Effects

* User is added to Waitlist.
* User is not counted as an attendee.
* User remains eligible for automatic promotion.

---

## Leave Waitlist

### State Transition

WAITLIST

→ SKIP

### Effects

* User is removed from Waitlist.
* User appears in Passed.

---

## Rejoin Waitlist

### Conditions

* Plan is full.
* waitlist_enabled = true.

### State Transition

SKIP

→ WAITLIST

### Effects

* User is removed from Passed.
* User is added back to Waitlist.

---

## Automatic Promotion

### Trigger

A confirmed attendee leaves the plan.

Examples:

* JOIN → SKIP
* Participant leaves the plan
* Host removes attendee

### Promotion Rule

The first waitlisted user is promoted automatically.

### Priority

joined_at ASC

First Come, First Served.

### State Transition

WAITLIST

→ JOIN

### Effects

* User is removed from Waitlist.
* User is added to Going.
* User is counted as an attendee.

Database remains the source of truth for all visibility, participation, waitlist ordering, and promotion state.

---

# Delete Circle Flow

## Purpose

Completely remove the circle.

Confirmation required.

### Database

Circle is deleted.

### Effects

* Circle disappears for all members.
* Circle membership records are removed.
* Circle can no longer receive plans.
* Circle can no longer be accessed.

### Important

Deleting a circle must NOT delete historical plans.

Plans previously created within that circle should remain available in plan history.

Historical plan records must remain intact.

Historical participation records must remain intact.

Circle deletion should only remove the social container, not the historical plan data.

---

# Historical Plan Preservation

If a circle is deleted:

Existing plans created within that circle:

* Remain in plan history.
* Remain visible to users who participated.
* Remain visible to hosts.
* Continue to preserve attendance history.

The circle may no longer exist, but the plans that occurred inside it remain part of user history.

This is required for:

* attendance history
* social memory
* future analytics
* wallet/payment reconciliation
* historical records

---

# Circle Visibility Rules

Users should only see circles they belong to.

Do NOT support:

* public circles
* searchable circles
* recommended circles

Planless circles are private social groups.

---

# Plan Visibility Rules

Circle plans are visible only to:

* current members
* hosts

Former members should not receive future plans.

Historical participation remains visible where appropriate.

---

# State Transitions

Create Circle

→ Active

Admin Adds User

→ Member

Member

→ Leave Circle

→ Non-Member

Admin

→ Remove Member

→ Non-Member

Member

→ Promote To Admin

→ Admin

DELIVERED

→ SEEN

SEEN

→ JOIN

SEEN

→ SKIP

SEEN

→ WAITLIST

WAITLIST

→ SKIP

SKIP

→ WAITLIST

WAITLIST

→ JOIN

Active Circle

→ Delete Circle

→ Deleted

Deleted Circle

→ Historical Plans Remain

---

# Non-Negotiable Rules

1. Circles are private groups.

2. Circles are coordination tools, not social networks.

3. Circle membership determines future plan visibility.

4. Historical participation should never be deleted.

5. Historical plans should never be deleted when a circle is deleted.

6. Admin changes must persist to the database.

7. Leaving a circle does not erase past plan participation.

8. Deleting a circle removes the group, not its plan history.

9. Database is the source of truth.

10. Refreshing or restarting the app must preserve all circle state.

11. Future circle plans should only be visible to current members.

12. Admins can directly add members without requiring approval.

13. Viewing a plan from the Home Feed, Circle, or Plan Preview should transition participant status from DELIVERED to SEEN.

14. SEEN indicates that a participant has viewed a plan but has not yet made a participation decision.

15. Valid participant states are DELIVERED, SEEN, JOIN, SKIP, and WAITLIST.

16. Waitlisted users are not counted as attendees.

17. Waitlist promotion must use joined_at ASC ordering.

18. Automatic promotion should occur when attendee capacity becomes available.

19. Database remains the source of truth for waitlist order and promotion state.

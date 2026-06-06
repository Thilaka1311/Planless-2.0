# TECHNICAL GUARDRAILS

## Source of Truth

Supabase is the source of truth.

UUIDs are used for:
- relationships
- joins
- foreign keys
- mutations

Text IDs are used only for:
- sharing
- public references
- debugging

No hardcoded production data.

No duplicate business logic.

No feature may introduce a second source of truth.

Database state always wins over local state.

---

## Lifecycle Rules

All lifecycle transitions must persist to the database.

UI state is never authoritative.

A lifecycle change is not complete until the database write succeeds.

Refresh application state after successful lifecycle mutations.

---

## Participant Status Rules

Participant statuses must be defined in:

DATABASE.md

PLAN_LIFECYCLE.md

Do not introduce new statuses without updating both documents.

Current valid statuses:

- delivered
- seen
- going
- skipped
- waitlist

No temporary statuses.

No screen-specific statuses.

---

## Plan Status Rules

Current valid plan statuses:

- active
- cancelled
- completed

Do not introduce new plan statuses without updating AI_CONTEXT.

---

## Host Rules

Host permissions derive from:

plans.host_id

Do not derive host permissions from UI state.

Do not store host information in participant statuses.

Host ownership must persist to the database.

---

## Friendship Rules

Friendships derive from Circle membership.

Do not introduce:
- followers
- following
- friend requests
- friend approvals

without updating FRIENDSHIPS.md.

---

## Business Logic Rules

Business logic should live in:

- services
- contexts
- state managers

Avoid placing business logic directly inside:

- UI components
- modals
- cards
- presentation layers

UI should consume business logic, not own it.

---

## Database Mutation Rules

Every mutation must:

1. Write to the database.
2. Verify success.
3. Refresh affected state.

Do not optimistically assume success without reconciliation.

---

## AI Development Rules

Before implementing any feature:

1. Read relevant AI_CONTEXT files.
2. Follow lifecycle definitions.
3. Follow database rules.
4. Follow architecture rules.

Do not invent:
- new workflows
- new states
- new permissions
- new lifecycle transitions

that are not defined in AI_CONTEXT.

If AI_CONTEXT conflicts with implementation:

AI_CONTEXT wins.

---

## Performance Rules

Avoid unnecessary database reads.

Avoid duplicate queries.

Prefer centralized data fetching.

Avoid storing duplicated representations of the same entity.

---

## Non-Negotiable Rules

1. Database is the source of truth.
2. Lifecycle definitions are authoritative.
3. Business logic must not be duplicated.
4. UI state is never authoritative.
5. Every lifecycle transition must persist.
6. AI_CONTEXT overrides implementation assumptions.
7. No feature may introduce a second source of truth.
# MEMORIES_DATABASE.md

# Planless 2.0 Memory Database Architecture

## Philosophy

The database is the source of truth.

A Memory is a permanent historical record of a completed Plan.

One Plan generates exactly one Memory.

```text
Plan
↓
Completed
↓
Memory
```

---

# Core Relationships

```text
plans
↓
memories
↓
memory_attendees
↓
memory_ratings
↓
memory_matches
```

One plan can have only one memory.

---

# Table: memories

Represents the memory generated from a completed plan.

## Columns

```sql
id uuid primary key

plan_id uuid not null unique
references plans(id)

memory_type text not null

status text not null

created_at timestamptz not null

locked_at timestamptz

editable_until timestamptz not null
```

---

## Memory Type Values

```text
football
badminton
movie
dining
```

---

## Status Values

```text
pending
completed
```

### pending

Memory exists but has not been finalized.

### completed

Memory has been saved and is historical.

---

# Table: memory_attendees

Frozen attendance snapshot.

Stores who actually attended when the plan was completed.

Attendance derives from:

```text
plan_participants.status = going
```

at completion time.

## Columns

```sql
id uuid primary key

memory_id uuid not null
references memories(id)

user_id uuid not null
references users(id)

created_at timestamptz not null
```

---

# Table: memory_ratings

Used for:

```text
movie
dining
```

Stores participant ratings.

One participant can rate only once.

## Columns

```sql
id uuid primary key

memory_id uuid not null
references memories(id)

user_id uuid not null
references users(id)

rating integer not null

created_at timestamptz not null
```

---

## Constraints

```sql
rating between 1 and 10
```

```sql
unique(memory_id, user_id)
```

---

# Table: memory_matches

Used only for badminton.

Stores multiple match results inside a single memory.

## Columns

```sql
id uuid primary key

memory_id uuid not null
references memories(id)

match_number integer not null

team_a_score integer not null

team_b_score integer not null

created_by uuid not null
references users(id)

created_at timestamptz not null
```

---

## Notes

Multiple rows may exist for a single memory.

Example:

```text
Memory
├── Match 1
├── Match 2
├── Match 3
```

---

# Football Memory Fields

Football does not require a separate table.

Store directly on memories.

## Additional Columns

```sql
team_a_score integer

team_b_score integer

mvp_user_id uuid
references users(id)
```

---

## Example

```text
Red Team 4
Blue Team 2

MVP:
Rahul
```

---

# Edit Window

Every memory receives:

```sql
editable_until
```

Value:

```text
memory_created_at + 24 hours
```

---

## Rule

Before allowing:

* score updates
* rating submissions
* badminton match creation

Verify:

```text
now < editable_until
```

---

## Lock Rule

When:

```text
now >= editable_until
```

memory becomes historical.

No further edits allowed.

---

# Visibility Rules

User can view a memory if:

## Rule 1

User attended the plan.

Stored in:

```text
memory_attendees
```

---

## Rule 2

User was a circle member before the memory was created.

Comparison:

```text
circle_members.joined_at
<
memory.created_at
```

Users joining later cannot see older memories.

---

# Completion Flow

Host marks plan:

```text
active
↓
completed
```

System automatically:

## Step 1

Create memory row.

## Step 2

Create attendee snapshot.

Insert all participants whose status is:

```text
going
```

## Step 3

Set:

```text
editable_until
=
created_at + 24h
```

## Step 4

Memory becomes available.

---

# Historical Preservation

Memories are never automatically deleted.

The following events do not remove memories:

* Leaving a circle
* Friendship removal
* Host transfer
* Circle deletion

Memories remain permanent historical records.

---

# Non-Negotiable Rules

1. One plan creates one memory.
2. Memories can only exist for completed plans.
3. Attendance is frozen at completion.
4. Ratings are stored per participant.
5. Badminton supports multiple matches.
6. Football supports final score and MVP.
7. Edit window is 24 hours.
8. After 24 hours memories are locked.
9. Database is the source of truth.
10. Memories are permanent historical records.

-- Migration: Add waitlisted_at to plan_participants
-- Description: Adds a nullable waitlisted_at TIMESTAMPTZ column and backfills existing waitlisted participants.

-- 1. Add column
ALTER TABLE plan_participants 
ADD COLUMN IF NOT EXISTS waitlisted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Backfill existing waitlisted participants with joined_at value
UPDATE plan_participants 
SET waitlisted_at = joined_at 
WHERE status = 'waitlist' AND waitlisted_at IS NULL;

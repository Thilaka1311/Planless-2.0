-- Migration: Add plan_team_assignments table for Football Team Organizer
-- Allows participants of a football plan to be assigned to Team A or Team B.

CREATE TABLE IF NOT EXISTS plan_team_assignments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     UUID        NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team        TEXT        NOT NULL CHECK (team IN ('A', 'B')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_plan_user_team UNIQUE (plan_id, user_id)
);

-- Index for fast per-plan lookups
CREATE INDEX IF NOT EXISTS idx_plan_team_assignments_plan_id
  ON plan_team_assignments (plan_id);

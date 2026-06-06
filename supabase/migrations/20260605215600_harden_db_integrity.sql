-- Migration: Database Constraint Hardening and Indexes
-- Target: Supabase database

-- 1. Unique constraint on (plan_id, user_id) in plan_participants to prevent duplicate joins/invitations
ALTER TABLE plan_participants 
ADD CONSTRAINT unique_plan_user_participant UNIQUE (plan_id, user_id);

-- 2. Indexes for optimized query performance
CREATE INDEX IF NOT EXISTS idx_plan_participants_plan_id_status ON plan_participants(plan_id, status);
CREATE INDEX IF NOT EXISTS idx_plans_created_by ON plans(created_by);
CREATE INDEX IF NOT EXISTS idx_circle_members_circle_id_user_id ON circle_members(circle_id, user_id);

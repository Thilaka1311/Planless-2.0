-- Migration: Add host_id to plans table
-- Description: Adds a host_id column referencing users.id and backfills it with created_by.

-- 1. Add column
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS host_id UUID REFERENCES users(id);

-- 2. Backfill column from created_by for existing records
UPDATE plans 
SET host_id = created_by 
WHERE host_id IS NULL;

-- 3. Set not null constraint (after backfill)
ALTER TABLE plans 
ALTER COLUMN host_id SET NOT NULL;

-- 4. Create index for query performance on host_id
CREATE INDEX IF NOT EXISTS idx_plans_host_id ON plans(host_id);

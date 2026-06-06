-- Migration: Refactor friendships schema
-- Description: Drops status column and adds symmetric constraints.

-- 1. Drop status column and its custom enum type
ALTER TABLE public.friendships DROP COLUMN IF EXISTS status;
DROP TYPE IF EXISTS friendship_status;

-- 2. Add constraint to enforce that sender_id < receiver_id (symmetry)
ALTER TABLE public.friendships 
ADD CONSTRAINT friendships_symmetric_order CHECK (sender_id < receiver_id);

-- 3. Add unique constraint to prevent duplicate relationships
ALTER TABLE public.friendships 
ADD CONSTRAINT unique_friendship_pair UNIQUE (sender_id, receiver_id);

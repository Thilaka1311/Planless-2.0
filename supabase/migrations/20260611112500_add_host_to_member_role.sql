-- Migration: Add 'host' role to member_role enum and migrate creators
-- Target: Supabase database

ALTER TABLE public.circle_members ALTER COLUMN role DROP DEFAULT;
ALTER TYPE member_role RENAME TO member_role_old;
CREATE TYPE member_role AS ENUM ('host', 'co_host', 'member');
ALTER TABLE public.circle_members ALTER COLUMN role TYPE member_role USING (CASE WHEN role::text = 'co_host' THEN 'co_host'::member_role ELSE role::text::member_role END);
ALTER TABLE public.circle_members ALTER COLUMN role SET DEFAULT 'member'::member_role;
DROP TYPE member_role_old;

UPDATE public.circle_members cm
SET role = 'host'::member_role
FROM public.circles c
WHERE cm.circle_id = c.id AND cm.user_id = c.created_by;

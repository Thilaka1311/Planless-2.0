-- Migration: Migrate circle_members role 'admin' to 'co_host'
-- Target: Supabase database

ALTER TABLE public.circle_members ALTER COLUMN role DROP DEFAULT;
ALTER TYPE member_role RENAME TO member_role_old;
CREATE TYPE member_role AS ENUM ('co_host', 'member');
ALTER TABLE public.circle_members ALTER COLUMN role TYPE member_role USING (CASE WHEN role::text = 'admin' THEN 'co_host'::member_role ELSE role::text::member_role END);
ALTER TABLE public.circle_members ALTER COLUMN role SET DEFAULT 'member'::member_role;
DROP TYPE member_role_old;

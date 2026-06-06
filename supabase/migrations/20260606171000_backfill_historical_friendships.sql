-- Migration: Backfill historical friendships
-- Description: Generates bidirectional friendships for all pre-existing circle members.

INSERT INTO public.friendships (sender_id, receiver_id)
SELECT DISTINCT
  LEAST(m1.user_id, m2.user_id) as sender_id,
  GREATEST(m1.user_id, m2.user_id) as receiver_id
FROM public.circle_members m1
JOIN public.circle_members m2 ON m1.circle_id = m2.circle_id
WHERE m1.user_id <> m2.user_id
ON CONFLICT (sender_id, receiver_id) DO NOTHING;

-- Drop legacy rating tables
DROP TABLE IF EXISTS public.memory_ratings CASCADE;
DROP TABLE IF EXISTS public.memory_matches CASCADE;

-- Clean up obsolete columns from memories table if any
ALTER TABLE public.memories DROP COLUMN IF EXISTS team_a_score;
ALTER TABLE public.memories DROP COLUMN IF EXISTS team_b_score;
ALTER TABLE public.memories DROP COLUMN IF EXISTS mvp_user_id;

-- 1. memory_movie_verdicts
CREATE TABLE public.memory_movie_verdicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  verdict TEXT NOT NULL CHECK (verdict IN ('loved_it', 'good', 'not_for_me')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(memory_id, user_id)
);

-- 2. memory_restaurant_votes
CREATE TABLE public.memory_restaurant_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  vote TEXT NOT NULL CHECK (vote IN ('yes', 'maybe', 'no')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(memory_id, user_id)
);

-- 3. memory_match_results
CREATE TABLE public.memory_match_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL UNIQUE REFERENCES public.memories(id) ON DELETE CASCADE,
  team_a_score INTEGER NOT NULL CHECK (team_a_score >= 0),
  team_b_score INTEGER NOT NULL CHECK (team_b_score >= 0),
  recorded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. memory_mvp_votes
CREATE TABLE public.memory_mvp_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  voter_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mvp_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(memory_id, voter_user_id)
);

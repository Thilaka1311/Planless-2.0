-- 1. Drop old plan_messages if exists
DROP TABLE IF EXISTS plan_messages CASCADE;

-- 2. Create circle_messages table
CREATE TABLE circle_messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id        UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  sender_id        UUID REFERENCES users(id) ON DELETE SET NULL,        -- NULL for system messages
  system_actor_id  UUID REFERENCES users(id) ON DELETE SET NULL,        -- Actor reference for dynamic rendering of system events
  parent_id        UUID REFERENCES circle_messages(id) ON DELETE CASCADE, -- Anchor for threading (NULL = root circle message)
  plan_id          UUID REFERENCES plans(id) ON DELETE CASCADE,         -- Association with a plan thread (NULL = general circle message)
  content          TEXT NOT NULL,
  message_type     TEXT NOT NULL DEFAULT 'user',                        -- 'user' | 'system'
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at        TIMESTAMPTZ NULL
);

-- Indices
CREATE INDEX idx_circle_messages_circle_parent ON circle_messages (circle_id, parent_id);
CREATE INDEX idx_circle_messages_plan ON circle_messages (plan_id) WHERE plan_id IS NOT NULL;
CREATE INDEX idx_circle_messages_created_at ON circle_messages (created_at DESC);

-- Enable Supabase Realtime for circle_messages
ALTER PUBLICATION supabase_realtime ADD TABLE circle_messages;

-- Set replica identity to FULL
ALTER TABLE circle_messages REPLICA IDENTITY FULL;

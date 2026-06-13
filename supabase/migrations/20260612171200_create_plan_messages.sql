-- Create plan_messages table with system actor and editing features
CREATE TABLE plan_messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id          UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  sender_id        UUID REFERENCES users(id) ON DELETE SET NULL,        -- NULL for system messages
  system_actor_id  UUID REFERENCES users(id) ON DELETE SET NULL,        -- Actor reference for dynamic rendering of system events
  content          TEXT NOT NULL,
  message_type     TEXT NOT NULL DEFAULT 'user',                        -- 'user' | 'system'
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at        TIMESTAMPTZ NULL
);

-- Index for retrieving messages (latest first for limits, then sorted ascending)
CREATE INDEX idx_plan_messages_plan_id_created_at ON plan_messages (plan_id, created_at DESC);

-- Enable Supabase Realtime for the plan_messages table
ALTER PUBLICATION supabase_realtime ADD TABLE plan_messages;

-- Set replica identity to FULL for change event payload integrity
ALTER TABLE plan_messages REPLICA IDENTITY FULL;

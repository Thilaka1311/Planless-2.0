-- Create circle_thread_reads table to track last read message per thread
CREATE TABLE circle_thread_reads (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  circle_id             UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  plan_id               UUID NULL REFERENCES plans(id) ON DELETE CASCADE,
  last_read_message_id  UUID NULL REFERENCES circle_messages(id) ON DELETE SET NULL,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint for General Chat (plan_id is NULL)
CREATE UNIQUE INDEX circle_thread_reads_general_unique_idx 
ON circle_thread_reads (user_id, circle_id) 
WHERE plan_id IS NULL;

-- Unique constraint for Plan Threads (plan_id is NOT NULL)
CREATE UNIQUE INDEX circle_thread_reads_plan_unique_idx 
ON circle_thread_reads (user_id, circle_id, plan_id) 
WHERE plan_id IS NOT NULL;

-- Enable Supabase Realtime for circle_thread_reads
ALTER PUBLICATION supabase_realtime ADD TABLE circle_thread_reads;

-- Set replica identity to FULL for realtime stream deletion/updates
ALTER TABLE circle_thread_reads REPLICA IDENTITY FULL;

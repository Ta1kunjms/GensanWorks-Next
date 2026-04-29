-- Store failed matching jobs for later retry and inspection
CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  jobseeker_id UUID REFERENCES jobseekers(id) ON DELETE CASCADE,
  error_code TEXT NOT NULL,
  error_message TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (job_id, jobseeker_id)
);

ALTER TABLE dead_letter_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on dead_letter_queue" ON dead_letter_queue;
CREATE POLICY "Service role full access on dead_letter_queue"
  ON dead_letter_queue FOR ALL USING (true) WITH CHECK (true);

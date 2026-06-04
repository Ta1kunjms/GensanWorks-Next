-- Behavioral interaction events
CREATE TABLE IF NOT EXISTS jobseeker_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jobseeker_id UUID NOT NULL REFERENCES jobseekers(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('view', 'save', 'apply', 'ignore', 'click')
  ),
  signal_weight NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  -- signal weights: apply=1.0, save=0.7, click=0.4, view=0.2, ignore=-0.3
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interactions_jobseeker
  ON jobseeker_interactions(jobseeker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_job
  ON jobseeker_interactions(job_id, created_at DESC);

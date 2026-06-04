-- Employer hiring outcomes for score recalibration
CREATE TABLE IF NOT EXISTS employer_hiring_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  jobseeker_id UUID NOT NULL REFERENCES jobseekers(id) ON DELETE CASCADE,
  employer_id UUID NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL CHECK (
    outcome IN ('hired', 'shortlisted', 'interviewed', 'rejected', 'withdrew')
  ),
  match_score_at_decision NUMERIC(5,2), -- snapshot of score when decision made
  dimension_scores_snapshot JSONB,      -- full F1–F8 snapshot for recalibration
  employer_notes TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outcomes_job
  ON employer_hiring_outcomes(job_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_employer
  ON employer_hiring_outcomes(employer_id, recorded_at DESC);

-- View: recalibration signals — which dimension scores predict hiring?
CREATE VIEW employer_feedback_summary AS
SELECT
  job_id,
  outcome,
  COUNT(*) as outcome_count,
  AVG(match_score_at_decision) as avg_score_at_decision,
  AVG((dimension_scores_snapshot->>'f1_skills')::numeric) as avg_f1,
  AVG((dimension_scores_snapshot->>'f2_experience')::numeric) as avg_f2,
  AVG((dimension_scores_snapshot->>'f3_education')::numeric) as avg_f3
FROM employer_hiring_outcomes
GROUP BY job_id, outcome;

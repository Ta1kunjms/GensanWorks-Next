-- Create match_disparity_flags table for AI matching disparity monitoring
CREATE TABLE IF NOT EXISTS match_disparity_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    flag_type TEXT NOT NULL, -- 'LOCATION_DISPARITY' | 'EDUCATION_DISPARITY'
    affected_group TEXT NOT NULL, -- the logistics_zone or education_level value
    avg_score_overall NUMERIC(5,2) NOT NULL,
    avg_score_group NUMERIC(5,2) NOT NULL,
    deviation_pct NUMERIC(5,2) NOT NULL,
    candidate_count INTEGER NOT NULL,
    flagged_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_match_disparity_job_id ON match_disparity_flags(job_id);
CREATE INDEX IF NOT EXISTS idx_match_disparity_flag_type ON match_disparity_flags(flag_type);

-- ============================================================
-- AI Correction Cache Tables
-- Caches skill spelling corrections and role equivalence results
-- to avoid redundant Groq API calls during matching.
-- ============================================================

-- 1. Skill correction cache
CREATE TABLE IF NOT EXISTS skill_correction_cache (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_input   TEXT NOT NULL UNIQUE,
  corrected   TEXT NOT NULL,
  confidence  FLOAT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  hit_count   INTEGER DEFAULT 1
);

-- 2. Role equivalence cache
CREATE TABLE IF NOT EXISTS role_equivalence_cache (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_a      TEXT NOT NULL,
  role_b      TEXT NOT NULL,
  same_role   BOOLEAN NOT NULL,
  similarity  FLOAT,
  reasoning   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  hit_count   INTEGER DEFAULT 1,
  UNIQUE(role_a, role_b)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_skill_correction_cache_raw_input
  ON skill_correction_cache(raw_input);

CREATE INDEX IF NOT EXISTS idx_role_equivalence_cache_roles
  ON role_equivalence_cache(role_a, role_b);

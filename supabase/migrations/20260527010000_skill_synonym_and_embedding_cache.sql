-- Migration: Create skill_synonyms table for AI-generated synonym resolution
-- Each row maps a canonical skill term to all its known aliases.
-- The scoring engine loads this at startup instead of using a hardcoded dictionary.

CREATE TABLE IF NOT EXISTS skill_synonyms (
  id          BIGSERIAL PRIMARY KEY,
  alias       TEXT NOT NULL,          -- The variant term (e.g., "ms excel", "excel", "spreadsheet")
  canonical   TEXT NOT NULL,          -- The normalized target (e.g., "microsoft excel")
  source      TEXT DEFAULT 'ai',      -- 'ai', 'manual', 'feedback'
  confidence  FLOAT DEFAULT 1.0,      -- How confident the source was in this mapping (0.0–1.0)
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure lookups are fast (alias is always lowercased before insert)
CREATE UNIQUE INDEX IF NOT EXISTS idx_skill_synonyms_alias ON skill_synonyms (alias);
CREATE INDEX IF NOT EXISTS idx_skill_synonyms_canonical ON skill_synonyms (canonical);

-- Grant access to the service role used by Next.js
GRANT SELECT ON skill_synonyms TO service_role;
GRANT INSERT ON skill_synonyms TO service_role;

-- ── Seed table: skill_embeddings_cache ────────────────────────────────────────
-- Stores on-demand OpenAI embeddings generated when a skill isn't found
-- in the pre-computed embedding map. Self-growing: every new misspelling or
-- abbreviation encountered gets cached here for future lookups.

CREATE TABLE IF NOT EXISTS skill_embeddings_cache (
  id          BIGSERIAL PRIMARY KEY,
  skill_term  TEXT NOT NULL UNIQUE,   -- Lowercased, normalized skill string
  vector      FLOAT[] NOT NULL,       -- 1536-dim OpenAI text-embedding-3-small vector
  model       TEXT DEFAULT 'text-embedding-3-small',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skill_embeddings_cache_term ON skill_embeddings_cache (skill_term);
GRANT SELECT ON skill_embeddings_cache TO service_role;
GRANT INSERT ON skill_embeddings_cache TO service_role;

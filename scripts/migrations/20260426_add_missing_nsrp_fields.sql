-- Migration: Add missing NSRP fields
-- Date: 2026-04-26

ALTER TABLE jobseekers 
  ADD COLUMN IF NOT EXISTS other_skills_others TEXT;

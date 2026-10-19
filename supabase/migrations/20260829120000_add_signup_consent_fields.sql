-- Migration: Add signup consent metadata fields (REVIEW-ONLY, NOT APPLIED)
-- Date: 2026-08-29
-- Description: Additive, nullable columns to record that a jobseeker or
-- employer acknowledged the (development-draft) Privacy Notice at signup.
-- This migration file is generated for review only. It has not been run
-- against any local or live database as part of Task 3.

ALTER TABLE jobseekers
  ADD COLUMN IF NOT EXISTS consent_given_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_privacy_notice_version text;

ALTER TABLE employers
  ADD COLUMN IF NOT EXISTS consent_given_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_privacy_notice_version text;

-- Migration: Add profile_image columns to jobseekers and employers
-- Date: 2026-04-26
-- Description: Adds a column to store the public URL of the profile/logo image for users.

ALTER TABLE jobseekers ADD COLUMN IF NOT EXISTS profile_image TEXT;
ALTER TABLE employers ADD COLUMN IF NOT EXISTS profile_image TEXT;

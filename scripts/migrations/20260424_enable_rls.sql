-- Migration: Enable Row Level Security (RLS) for Jobseeker Portal
-- Date: 2026-04-24
-- Description: This script secures all jobseeker-related tables at the database level.
-- Even if an API route is compromised or buggy, these policies ensure users can 
-- only access their own data.

-----------------------------------------------------------
-- 1. Applications Table
-----------------------------------------------------------
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Jobseekers can see only their own applications
CREATE POLICY "Jobseekers can view own applications"
ON applications FOR SELECT
TO authenticated
USING (auth.uid() = applicant_id);

-- Jobseekers can create their own applications
CREATE POLICY "Jobseekers can create own applications"
ON applications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = applicant_id);

-- Employers can see applications for their jobs
CREATE POLICY "Employers can view applications for their jobs"
ON applications FOR SELECT
TO authenticated
USING (auth.uid() = employer_id);

-----------------------------------------------------------
-- 2. Jobseeker Profile Table
-----------------------------------------------------------
ALTER TABLE jobseekers ENABLE ROW LEVEL SECURITY;

-- Jobseekers can see and edit only their own profile
CREATE POLICY "Jobseekers can view own profile"
ON jobseekers FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Jobseekers can update own profile"
ON jobseekers FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-----------------------------------------------------------
-- 3. Saved Jobs Table
-----------------------------------------------------------
ALTER TABLE jobseeker_saved_jobs ENABLE ROW LEVEL SECURITY;

-- Jobseekers can manage only their own saved jobs
CREATE POLICY "Users can manage own saved jobs"
ON jobseeker_saved_jobs FOR ALL
TO authenticated
USING (auth.uid() = jobseeker_id)
WITH CHECK (auth.uid() = jobseeker_id);

-----------------------------------------------------------
-- 4. Referrals Table
-----------------------------------------------------------
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Jobseekers can see referrals intended for them
CREATE POLICY "Jobseekers can view own referrals"
ON referrals FOR SELECT
TO authenticated
USING (auth.uid() = jobseeker_id);

-----------------------------------------------------------
-- 5. Notifications Table
-----------------------------------------------------------
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can see only their own notifications
CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can update (mark as read) only their own notifications
CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-----------------------------------------------------------
-- 6. Messages Table
-----------------------------------------------------------
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can see messages where they are either sender or recipient
CREATE POLICY "Users can view own messages"
ON messages FOR SELECT
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Users can send messages as themselves
CREATE POLICY "Users can send messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

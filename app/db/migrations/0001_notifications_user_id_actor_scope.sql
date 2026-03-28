-- Make notifications recipient id role-agnostic (admin/employer/jobseeker)
-- Previous schema used UUID FK to users(id), which blocks employer/admin notifications.

ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_user_id_users_id_fk;

ALTER TABLE notifications
  ALTER COLUMN user_id TYPE varchar(64) USING user_id::text;

-- Keep existing index and role filtering behavior.

-- Make messages sender/recipient ids role-agnostic (admin/employer/jobseeker)
-- Previous schema used UUID FKs to users(id), which blocks cross-role messaging.

ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS messages_sender_id_users_id_fk;

ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS messages_recipient_id_users_id_fk;

ALTER TABLE messages
  ALTER COLUMN sender_id TYPE varchar(64) USING sender_id::text;

ALTER TABLE messages
  ALTER COLUMN recipient_id TYPE varchar(64) USING recipient_id::text;

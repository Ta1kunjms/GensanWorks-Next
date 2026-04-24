-- Migration: Add Audit Logs Table
-- Date: 2026-04-24

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    payload JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index for faster querying by user and action
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Enable RLS on audit_logs (Only admins can read all, users can't read their own logs by default for security, or we can allow it)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated admins can view audit logs
CREATE POLICY "Admins can view all audit logs" 
ON audit_logs 
FOR SELECT 
TO authenticated 
USING (
  (SELECT role FROM auth.users WHERE id = auth.uid()) = 'admin'
);

-- Add missing salary_period column to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_period TEXT DEFAULT 'monthly';

-- Comment for documentation
COMMENT ON COLUMN jobs.salary_period IS 'The period for which the salary is paid (e.g., monthly, weekly, daily, hourly)';

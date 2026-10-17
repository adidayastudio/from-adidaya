-- Add reject_reason column to all clock request tables
ALTER TABLE overtime_logs ADD COLUMN IF NOT EXISTS reject_reason TEXT;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS reject_reason TEXT;
ALTER TABLE business_trips ADD COLUMN IF NOT EXISTS reject_reason TEXT;

-- Verify policies are still correct (optional, but good practice)
-- Ensure Managers can update these columns
-- (Policies created previously often cover all columns using FOR UPDATE with check)

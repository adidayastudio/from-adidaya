-- Add columns to reimbursement_requests
ALTER TABLE reimbursement_requests
ADD COLUMN IF NOT EXISTS subcategory TEXT,
ADD COLUMN IF NOT EXISTS revision_reason TEXT,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS approved_amount NUMERIC;

-- Note: We are using TEXT for status in the app, so we don't strictly need to alter an ENUM type in the DB unless one exists.
-- If there is a check constraint, we might need to update it.
-- Let's check for check constraints later if needed, usually Supabase is flexible unless explicit enum type used.

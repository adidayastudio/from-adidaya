-- Add contract_end_date and probation_status to profiles table

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS contract_end_date DATE,
ADD COLUMN IF NOT EXISTS probation_status TEXT DEFAULT 'Passed';

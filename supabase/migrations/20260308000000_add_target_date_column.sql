-- Add target_date column to purchasing_requests and reimbursement_requests
ALTER TABLE purchasing_requests
ADD COLUMN IF NOT EXISTS target_date DATE;

ALTER TABLE reimbursement_requests
ADD COLUMN IF NOT EXISTS target_date DATE;

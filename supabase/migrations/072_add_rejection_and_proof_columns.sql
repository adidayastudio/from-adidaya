-- Add rejection_reason and payment_proof_url columns to purchasing_requests
ALTER TABLE purchasing_requests 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;

-- Add rejection_reason and payment_proof_url columns to reimbursement_requests
ALTER TABLE reimbursement_requests 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;

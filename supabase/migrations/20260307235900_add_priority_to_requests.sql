-- Add priority column to purchasing_requests
ALTER TABLE purchasing_requests
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'MEDIUM';

-- Add priority column to reimbursement_requests
ALTER TABLE reimbursement_requests
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'MEDIUM';

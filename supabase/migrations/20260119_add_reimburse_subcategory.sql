-- Add columns to reimbursement_requests
ALTER TABLE reimbursement_requests
ADD COLUMN IF NOT EXISTS subcategory TEXT,
ADD COLUMN IF NOT EXISTS revision_reason TEXT,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS approved_amount NUMERIC;

-- Drop existing check constraints to update them with new values
ALTER TABLE reimbursement_requests DROP CONSTRAINT IF EXISTS reimbursement_requests_category_check;
ALTER TABLE reimbursement_requests DROP CONSTRAINT IF EXISTS reimbursement_requests_status_check;

-- Add updated check constraint for categories
ALTER TABLE reimbursement_requests
ADD CONSTRAINT reimbursement_requests_category_check
CHECK (category IN (
    'TRANSPORTATION',
    'CONSUMPTION',
    'ACCOMMODATION',
    'PURCHASE_PROJECT',
    'OPERATIONS_PROJECT',
    'SUPPORT_OFFICE',
    'COMMUNICATION',
    'HEALTH_SAFETY',
    'TRAVEL_DUTY',
    'EMERGENCY',
    'OTHER'
));

-- Add updated check constraint for status
ALTER TABLE reimbursement_requests
ADD CONSTRAINT reimbursement_requests_status_check
CHECK (status IN (
    'DRAFT',
    'PENDING',
    'APPROVED',
    'PAID',
    'REJECTED',
    'CANCELLED',
    'NEED_REVISION'
));

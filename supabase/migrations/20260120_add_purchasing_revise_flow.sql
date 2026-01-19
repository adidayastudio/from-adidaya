-- Migration: Add NEED_REVISION status and revision_reason column to purchasing_requests

-- 1. Add revision_reason column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchasing_requests' AND column_name='revision_reason') THEN
        ALTER TABLE purchasing_requests ADD COLUMN revision_reason TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchasing_requests' AND column_name='approved_amount') THEN
        ALTER TABLE purchasing_requests ADD COLUMN approved_amount NUMERIC;
    END IF;
END $$;

-- 2. Update approval_status check constraint
-- First drop existing constraint
ALTER TABLE purchasing_requests DROP CONSTRAINT IF EXISTS purchasing_requests_approval_status_check;

-- Add updated constraint including NEED_REVISION
ALTER TABLE purchasing_requests ADD CONSTRAINT purchasing_requests_approval_status_check 
CHECK (approval_status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'PAID', 'REJECTED', 'CANCELLED', 'NEED_REVISION'));

-- Migration: Add support for partial payments
-- 1. Drop existing check constraint and add updated one with PARTIALLY_PAID
ALTER TABLE purchasing_requests DROP CONSTRAINT IF EXISTS purchasing_requests_financial_status_check;
ALTER TABLE purchasing_requests ADD CONSTRAINT purchasing_requests_financial_status_check CHECK (financial_status IN ('NOT_PAYABLE', 'UNPAID', 'PARTIALLY_PAID', 'PAID'));

-- 2. Add paid_amount numeric column
ALTER TABLE purchasing_requests ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0;

-- Create table for saved beneficiary accounts
CREATE TABLE IF NOT EXISTS finance_beneficiary_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    alias TEXT,
    is_global BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE finance_beneficiary_accounts ENABLE ROW LEVEL SECURITY;

-- Policies for finance_beneficiary_accounts
-- View: users can see global accounts OR their own accounts
CREATE POLICY "View beneficiary accounts" ON finance_beneficiary_accounts
    FOR SELECT USING (is_global = true OR created_by = auth.uid());

-- Insert: users can create their own accounts
CREATE POLICY "Create beneficiary accounts" ON finance_beneficiary_accounts
    FOR INSERT WITH CHECK (created_by = auth.uid());

-- Update/Delete: users can manage their own accounts
CREATE POLICY "Manage own beneficiary accounts" ON finance_beneficiary_accounts
    FOR ALL USING (created_by = auth.uid());

-- Add columns to purchasing_requests
ALTER TABLE purchasing_requests
ADD COLUMN IF NOT EXISTS beneficiary_bank TEXT,
ADD COLUMN IF NOT EXISTS beneficiary_number TEXT,
ADD COLUMN IF NOT EXISTS beneficiary_name TEXT;

-- Add columns to reimbursement_requests
ALTER TABLE reimbursement_requests
ADD COLUMN IF NOT EXISTS beneficiary_bank TEXT,
ADD COLUMN IF NOT EXISTS beneficiary_number TEXT,
ADD COLUMN IF NOT EXISTS beneficiary_name TEXT;

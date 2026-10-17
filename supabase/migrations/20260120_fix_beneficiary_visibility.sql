-- Fix beneficiary accounts visibility
-- This migration does two things:
-- 1. Updates all existing accounts to be global (is_global = true)
-- 2. Updates RLS policies to allow all authenticated users to see all accounts

-- Step 1: Update all existing accounts to be global
UPDATE finance_beneficiary_accounts SET is_global = true WHERE is_global = false OR is_global IS NULL;

-- Step 2: DROP OLD POLICIES
DROP POLICY IF EXISTS "View beneficiary accounts" ON finance_beneficiary_accounts;
DROP POLICY IF EXISTS "View all beneficiary accounts" ON finance_beneficiary_accounts;
DROP POLICY IF EXISTS "Create beneficiary accounts" ON finance_beneficiary_accounts;
DROP POLICY IF EXISTS "Create shared beneficiary accounts" ON finance_beneficiary_accounts;
DROP POLICY IF EXISTS "Manage own beneficiary accounts" ON finance_beneficiary_accounts;
DROP POLICY IF EXISTS "Delete own beneficiary accounts" ON finance_beneficiary_accounts;

-- Step 3: Create new policies that allow all authenticated users to view all accounts
-- View: all authenticated users can see all beneficiary accounts
CREATE POLICY "View all beneficiary accounts" ON finance_beneficiary_accounts
    FOR SELECT USING (auth.role() = 'authenticated');

-- Insert: users can create accounts (they become shared by default)
CREATE POLICY "Create shared beneficiary accounts" ON finance_beneficiary_accounts
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Update: only creator can edit their accounts
CREATE POLICY "Update own beneficiary accounts" ON finance_beneficiary_accounts
    FOR UPDATE USING (auth.uid() = created_by);

-- Delete: only creator can delete their accounts
CREATE POLICY "Delete own beneficiary accounts" ON finance_beneficiary_accounts
    FOR DELETE USING (auth.uid() = created_by);

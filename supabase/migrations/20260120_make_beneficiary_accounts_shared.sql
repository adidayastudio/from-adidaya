-- Update RLS policies for finance_beneficiary_accounts to be shared
-- DROP OLD POLICIES
DROP POLICY IF EXISTS "View beneficiary accounts" ON finance_beneficiary_accounts;
DROP POLICY IF EXISTS "Create beneficiary accounts" ON finance_beneficiary_accounts;
DROP POLICY IF EXISTS "Manage own beneficiary accounts" ON finance_beneficiary_accounts;

-- NEW POLICIES
-- View: all authenticated users can see all beneficiary accounts
CREATE POLICY "View all beneficiary accounts" ON finance_beneficiary_accounts
    FOR SELECT USING (auth.role() = 'authenticated');

-- Insert: users can create accounts, and they are shared (is_global = true) by default or logic
-- We keep is_global = true to signify they are shared
CREATE POLICY "Create shared beneficiary accounts" ON finance_beneficiary_accounts
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Manage: only creator can edit/delete their own accounts for now (safeguard)
-- or maybe we allow all to edit? The request says "saved account itu harus muncul di semua orang... mudah ditrack dan diambil datanya"
-- Usually editing should be restricted to creator to avoid accidental mess, but viewing is for all.
CREATE POLICY "Manage own beneficiary accounts" ON finance_beneficiary_accounts
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Delete own beneficiary accounts" ON finance_beneficiary_accounts
    FOR DELETE USING (auth.uid() = created_by);

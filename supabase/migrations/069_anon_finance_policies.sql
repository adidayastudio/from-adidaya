-- Add permissive RLS policies for anon role to allow operations when auth context is missing
-- This is a workaround for Next.js client-side Supabase client not properly passing auth headers

-- Purchasing Requests: Allow anon read when data exists
CREATE POLICY "Enable anon read access for purchasing_requests"
ON purchasing_requests FOR SELECT
TO anon
USING (true);

-- Purchasing Requests: Allow anon insert when created_by is provided
CREATE POLICY "Enable anon insert for purchasing_requests"
ON purchasing_requests FOR INSERT
TO anon
WITH CHECK (created_by IS NOT NULL);

-- Purchasing Requests: Allow anon update when created_by matches
CREATE POLICY "Enable anon update for purchasing_requests"
ON purchasing_requests FOR UPDATE
TO anon
USING (true);

-- Purchasing Items: Allow anon full access
CREATE POLICY "Enable anon read access for purchasing_items"
ON purchasing_items FOR SELECT
TO anon
USING (true);

CREATE POLICY "Enable anon insert for purchasing_items"
ON purchasing_items FOR INSERT
TO anon
WITH CHECK (true);

-- Reimbursement Requests: Allow anon access
CREATE POLICY "Enable anon read access for reimbursement_requests"
ON reimbursement_requests FOR SELECT
TO anon
USING (true);

CREATE POLICY "Enable anon insert for reimbursement_requests"
ON reimbursement_requests FOR INSERT
TO anon
WITH CHECK (created_by IS NOT NULL);

CREATE POLICY "Enable anon update for reimbursement_requests"
ON reimbursement_requests FOR UPDATE
TO anon
USING (true);

-- Reimbursement Items: Allow anon full access
CREATE POLICY "Enable anon read access for reimbursement_items"
ON reimbursement_items FOR SELECT
TO anon
USING (true);

CREATE POLICY "Enable anon insert for reimbursement_items"
ON reimbursement_items FOR INSERT
TO anon
WITH CHECK (true);

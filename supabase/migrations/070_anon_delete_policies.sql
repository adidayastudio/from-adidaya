-- Add DELETE RLS policies for anon role
-- This allows delete operations on finance tables when using anon role

-- Purchasing Requests: Allow anon delete
CREATE POLICY "Enable anon delete for purchasing_requests"
ON purchasing_requests FOR DELETE
TO anon
USING (true);

-- Purchasing Items: Allow anon delete  
CREATE POLICY "Enable anon delete for purchasing_items"
ON purchasing_items FOR DELETE
TO anon
USING (true);

-- Reimbursement Requests: Allow anon delete
CREATE POLICY "Enable anon delete for reimbursement_requests"
ON reimbursement_requests FOR DELETE
TO anon
USING (true);

-- Reimbursement Items: Allow anon delete
CREATE POLICY "Enable anon delete for reimbursement_items"
ON reimbursement_items FOR DELETE
TO anon
USING (true);

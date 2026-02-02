-- Fix RLS for purchasing_items
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON purchasing_items;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON purchasing_items;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON purchasing_items;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON purchasing_items;

CREATE POLICY "Enable read access for authenticated users" ON purchasing_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON purchasing_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for authenticated users" ON purchasing_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete access for authenticated users" ON purchasing_items FOR DELETE TO authenticated USING (true);

-- Fix RLS for reimbursement_items
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON reimbursement_items;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON reimbursement_items;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON reimbursement_items;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON reimbursement_items;

CREATE POLICY "Enable read access for authenticated users" ON reimbursement_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON reimbursement_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for authenticated users" ON reimbursement_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete access for authenticated users" ON reimbursement_items FOR DELETE TO authenticated USING (true);

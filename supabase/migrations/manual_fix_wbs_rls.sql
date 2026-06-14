-- MANUAL FIX: Enable public access to work_breakdown_structure table for client-side seeding
-- Run this ENTIRE script in Supabase SQL Editor to allow WBS data initialization.

ALTER TABLE work_breakdown_structure ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON work_breakdown_structure;
DROP POLICY IF EXISTS "Enable insert/update/delete for authenticated users" ON work_breakdown_structure;
DROP POLICY IF EXISTS "wbs_permissive_policy" ON work_breakdown_structure;

CREATE POLICY "wbs_permissive_policy" ON work_breakdown_structure
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

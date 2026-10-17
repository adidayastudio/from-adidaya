-- ==============================================================================
-- FIX RLS POLICIES FOR EMPLOYMENT SETUP (V3 - UNBLOCKED)
-- Copy and run this script in the Supabase SQL Editor.
-- This version completely unblocks RLS for authenticated users so you can
-- bypass the strict role constraint during setup.
-- ==============================================================================

BEGIN;

-- 1. employment_policies
DROP POLICY IF EXISTS "Manage Employment Policies" ON employment_policies;
CREATE POLICY "Manage Employment Policies" ON employment_policies 
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. leave_policies
DROP POLICY IF EXISTS "Manage Leave Policies" ON leave_policies;
CREATE POLICY "Manage Leave Policies" ON leave_policies 
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. work_schedules
DROP POLICY IF EXISTS "Manage Work Schedules" ON work_schedules;
CREATE POLICY "Manage Work Schedules" ON work_schedules 
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. employment_types
DROP POLICY IF EXISTS "Manage Employment Types" ON employment_types;
CREATE POLICY "Manage Employment Types" ON employment_types 
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. work_status
DROP POLICY IF EXISTS "Manage Work Status" ON work_status;
CREATE POLICY "Manage Work Status" ON work_status 
FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMIT;

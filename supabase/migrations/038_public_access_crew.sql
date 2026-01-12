-- Allow Public Access to Crew Members for Debugging (FULL ACCESS)
-- This solves the "NO USER" / RLS blocking issue temporarily.
-- We will revert this to 'authenticated' once the auth flow is stable.

DROP POLICY IF EXISTS "crew_members_select" ON crew_members;
DROP POLICY IF EXISTS "crew_members_select_public" ON crew_members;
DROP POLICY IF EXISTS "crew_members_insert" ON crew_members;
DROP POLICY IF EXISTS "crew_members_update" ON crew_members;
DROP POLICY IF EXISTS "crew_members_delete" ON crew_members;

-- Enable FULL public access for testing purposes
CREATE POLICY "crew_members_all_public" ON crew_members FOR ALL USING (true);

-- Also for history if needed
DROP POLICY IF EXISTS "crew_project_history_all" ON crew_project_history;
DROP POLICY IF EXISTS "crew_project_history_all_public" ON crew_project_history;
CREATE POLICY "crew_project_history_all_public" ON crew_project_history FOR ALL USING (true);

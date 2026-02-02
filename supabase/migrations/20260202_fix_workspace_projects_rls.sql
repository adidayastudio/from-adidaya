-- =========================================
-- Fix Workspaces and Projects RLS for Public Access
-- =========================================
-- Ensure workspaces and projects tables are accessible without strict auth requirements

-- 1. WORKSPACES - Ensure permissive access
ALTER TABLE IF EXISTS workspaces ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "workspaces_select_public" ON workspaces;
DROP POLICY IF EXISTS "workspaces_all_public" ON workspaces;
DROP POLICY IF EXISTS "Anyone can view workspaces" ON workspaces;

-- Create permissive policy for all operations
CREATE POLICY "workspaces_permissive_policy" 
ON workspaces 
FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- 2. PROJECTS - Ensure permissive access (refresh policies)
-- Drop and recreate to ensure consistency
DROP POLICY IF EXISTS "Anyone can view projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can update own projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can delete own projects" ON projects;
DROP POLICY IF EXISTS "Anyone view projects" ON projects;
DROP POLICY IF EXISTS "Users manage projects" ON projects;
DROP POLICY IF EXISTS "projects_permissive_policy" ON projects;

-- Create single permissive policy
CREATE POLICY "projects_permissive_policy"
ON projects
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 3. CREW_MEMBERS - Ensure permissive access
ALTER TABLE IF EXISTS crew_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "crew_members_select" ON crew_members;
DROP POLICY IF EXISTS "crew_members_insert" ON crew_members;
DROP POLICY IF EXISTS "crew_members_update" ON crew_members;
DROP POLICY IF EXISTS "crew_members_delete" ON crew_members;
DROP POLICY IF EXISTS "crew_members_select_public" ON crew_members;
DROP POLICY IF EXISTS "crew_members_all_public" ON crew_members;
DROP POLICY IF EXISTS "crew_members_permissive_policy" ON crew_members;

-- Create permissive policy
CREATE POLICY "crew_members_permissive_policy"
ON crew_members
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 4. CREW_PROJECT_HISTORY - Also fix
ALTER TABLE IF EXISTS crew_project_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crew_project_history_all" ON crew_project_history;
DROP POLICY IF EXISTS "crew_project_history_all_public" ON crew_project_history;
DROP POLICY IF EXISTS "crew_project_history_permissive" ON crew_project_history;

CREATE POLICY "crew_project_history_permissive"
ON crew_project_history
FOR ALL
TO public
USING (true)
WITH CHECK (true);

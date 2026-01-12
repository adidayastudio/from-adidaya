-- =========================================
-- 035: FIX PROJECTS RLS FOR INSERT/UPDATE
-- =========================================
-- Enable authenticated users to insert and update projects

-- First, ensure RLS is enabled (if not already)
ALTER TABLE IF EXISTS projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can update own projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can delete own projects" ON projects;
DROP POLICY IF EXISTS "Anyone can view projects" ON projects;

-- Create permissive policies for development
-- Note: In production, you should restrict these based on workspace membership

-- Allow anyone to view all projects
CREATE POLICY "Anyone can view projects"
ON projects FOR SELECT
USING (true);

-- Allow authenticated users to insert projects
CREATE POLICY "Authenticated users can insert projects"
ON projects FOR INSERT
WITH CHECK (true);

-- Allow authenticated users to update any project
CREATE POLICY "Authenticated users can update own projects"
ON projects FOR UPDATE
USING (true);

-- Allow authenticated users to delete any project
CREATE POLICY "Authenticated users can delete own projects"
ON projects FOR DELETE
USING (true);

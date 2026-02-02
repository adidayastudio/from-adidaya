-- RESTORE VISIBILITY FOR FUNDING SOURCES
-- Run this in Supabase SQL Editor if data is still missing in the app

-- 1. Ensure RLS is enabled
ALTER TABLE funding_sources ENABLE ROW LEVEL SECURITY;

-- 2. Clean up any broken or restrictive policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON funding_sources;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON funding_sources;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON funding_sources;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON funding_sources;
DROP POLICY IF EXISTS "policy_allow_all_funding" ON funding_sources;
DROP POLICY IF EXISTS "policy_allow_all_funding_v2" ON funding_sources;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON funding_sources;

-- 3. Create a comprehensive permissive policy
-- This allows both signed-in users and the 'anon' client (used by some server components) to see the data
CREATE POLICY "policy_allow_all_funding_v3"
ON funding_sources
FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

-- 4. Explicitly grant permissions to ensure roles can execute operations
GRANT ALL ON funding_sources TO anon;
GRANT ALL ON funding_sources TO authenticated;
GRANT ALL ON funding_sources TO service_role;

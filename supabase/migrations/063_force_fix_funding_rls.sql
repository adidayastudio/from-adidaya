-- FORCE FIX RLS FOR FUNDING SOURCES
-- Run this in Supabase SQL Editor

-- 1. Temporarily disable RLS to ensure we can modify policies without interference (and clear slate)
ALTER TABLE funding_sources DISABLE ROW LEVEL SECURITY;

-- 2. Drop legacy polices (handle all possible names from previous attempts)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON funding_sources;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON funding_sources;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON funding_sources;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON funding_sources;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON funding_sources;
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON funding_sources;
DROP POLICY IF EXISTS "policy_allow_all" ON funding_sources;

-- 3. Re-enable RLS
ALTER TABLE funding_sources ENABLE ROW LEVEL SECURITY;

-- 4. Create ONE simple, permissive policy for authenticated users and service roles
CREATE POLICY "policy_allow_all_funding"
ON funding_sources
FOR ALL
TO authenticated, service_role
USING (true)
WITH CHECK (true);

-- 5. Explicitly grant permissions
GRANT ALL ON funding_sources TO authenticated;
GRANT ALL ON funding_sources TO service_role;

-- 6. Verify Table Ownership (optional, but good for completeness)
ALTER TABLE funding_sources OWNER TO postgres;

-- FIX RLS POLICIES FOR FUNDING SOURCES
-- Run this entire script in the SQL Editor

-- 1. Drop existing policies to ensure a clean slate
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON funding_sources;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON funding_sources;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON funding_sources;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON funding_sources;
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON funding_sources;

-- 2. Enable RLS (just in case)
ALTER TABLE funding_sources ENABLE ROW LEVEL SECURITY;

-- 3. Create a comprehensive policy for authenticated users
CREATE POLICY "Enable all access for authenticated users"
ON funding_sources
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Grant permissions to service_role (optional but good practice)
GRANT ALL ON funding_sources TO service_role;
GRANT ALL ON funding_sources TO authenticated;

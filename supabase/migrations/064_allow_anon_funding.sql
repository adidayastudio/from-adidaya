-- ALLOW ANON ACCESS FOR FUNDING SOURCES (DEBUGGING)
-- The application client is currently connecting as 'anon', so we must allow it.

-- 1. Drop the previous policy to avoid conflicts or confusion
DROP POLICY IF EXISTS "policy_allow_all_funding" ON funding_sources;

-- 2. Create a truly open policy for anon, authenticated, and service_role
CREATE POLICY "policy_allow_all_funding_v2"
ON funding_sources
FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

-- 3. Grant permissions to anon role explicitly
GRANT ALL ON funding_sources TO anon;
GRANT ALL ON funding_sources TO authenticated;
GRANT ALL ON funding_sources TO service_role;

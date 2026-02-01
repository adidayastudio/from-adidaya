-- DEBUG: Temporarily disable RLS on performance_rules to diagnose "hanging" saves
-- If this fixes the issue, we know the policies were causing a lock or recursion.

ALTER TABLE performance_rules DISABLE ROW LEVEL SECURITY;

-- Also verify grants just in case
GRANT ALL ON performance_rules TO authenticated;
GRANT ALL ON performance_rules TO service_role;

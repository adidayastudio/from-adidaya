-- =========================================
-- Fix Crew Daily Logs and Crew Requests RLS Policies
-- =========================================
-- This migration ensures crew_daily_logs and crew_requests tables
-- have permissive RLS policies matching other crew tables.
-- This fixes the issue where daily logs appear missing due to
-- RLS blocking data access.

-- =========================================
-- 1. CREW_DAILY_LOGS - Fix RLS
-- =========================================
ALTER TABLE IF EXISTS crew_daily_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public access for now" ON crew_daily_logs;
DROP POLICY IF EXISTS "crew_daily_logs_select" ON crew_daily_logs;
DROP POLICY IF EXISTS "crew_daily_logs_insert" ON crew_daily_logs;
DROP POLICY IF EXISTS "crew_daily_logs_update" ON crew_daily_logs;
DROP POLICY IF EXISTS "crew_daily_logs_delete" ON crew_daily_logs;
DROP POLICY IF EXISTS "crew_daily_logs_all_public" ON crew_daily_logs;
DROP POLICY IF EXISTS "crew_daily_logs_permissive" ON crew_daily_logs;

-- Create permissive policy
CREATE POLICY "crew_daily_logs_permissive"
ON crew_daily_logs
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Grant permissions
GRANT ALL ON crew_daily_logs TO authenticated;
GRANT ALL ON crew_daily_logs TO service_role;
GRANT ALL ON crew_daily_logs TO anon;

-- =========================================
-- 2. CREW_REQUESTS - Fix RLS
-- =========================================
ALTER TABLE IF EXISTS crew_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON crew_requests;
DROP POLICY IF EXISTS "Crew requests access" ON crew_requests;
DROP POLICY IF EXISTS "crew_requests_select" ON crew_requests;
DROP POLICY IF EXISTS "crew_requests_insert" ON crew_requests;
DROP POLICY IF EXISTS "crew_requests_update" ON crew_requests;
DROP POLICY IF EXISTS "crew_requests_delete" ON crew_requests;
DROP POLICY IF EXISTS "crew_requests_all_public" ON crew_requests;
DROP POLICY IF EXISTS "crew_requests_permissive" ON crew_requests;

-- Create permissive policy
CREATE POLICY "crew_requests_permissive"
ON crew_requests
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Grant permissions
GRANT ALL ON crew_requests TO authenticated;
GRANT ALL ON crew_requests TO service_role;
GRANT ALL ON crew_requests TO anon;

-- Enable RLS for performance and history tables
ALTER TABLE people_performance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_history ENABLE ROW LEVEL SECURITY;

-- 1. Performance Snapshots
DROP POLICY IF EXISTS "Authenticated users can view all performance snapshots" ON people_performance_snapshots;
DROP POLICY IF EXISTS "Users can view own performance snapshots" ON people_performance_snapshots;

CREATE POLICY "Authenticated users can view all performance snapshots"
ON people_performance_snapshots FOR SELECT
TO authenticated
USING (true);

-- 2. Career History
DROP POLICY IF EXISTS "Authenticated users can view all career history" ON career_history;
DROP POLICY IF EXISTS "Users can view own career history" ON career_history;

CREATE POLICY "Authenticated users can view all career history"
ON career_history FOR SELECT
TO authenticated
USING (true);

-- Fix RLS policies for performance_rules
-- Drop existing policies to ensure a clean slate
DROP POLICY IF EXISTS "Allow read performance_rules" ON performance_rules;
DROP POLICY IF EXISTS "Allow write performance_rules" ON performance_rules;
DROP POLICY IF EXISTS "Allow update performance_rules" ON performance_rules;
DROP POLICY IF EXISTS "Enable read access for all users" ON performance_rules;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON performance_rules;
DROP POLICY IF EXISTS "Enable update for users based on email" ON performance_rules;

-- Re-enable RLS just in case
ALTER TABLE performance_rules ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for authenticated users
-- We allow INSERT because the system creates new versions on save
CREATE POLICY "Allow read performance_rules" 
ON performance_rules FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow insert performance_rules" 
ON performance_rules FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow update performance_rules" 
ON performance_rules FOR UPDATE 
TO authenticated 
USING (true);

-- 1. Ensure columns exist (Safe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'boq_definitions' AND column_name = 'formula') THEN
        ALTER TABLE boq_definitions ADD COLUMN formula TEXT;
    END IF;
END $$;

-- 2. DISABLE RLS (The "Nuclear Option" for Dev Mode)
-- This ensures that NO permission checks are performed, allowing Anonymous inserts.
ALTER TABLE boq_definitions DISABLE ROW LEVEL SECURITY;
ALTER TABLE boq_elements DISABLE ROW LEVEL SECURITY;

-- 3. (Optional) Cleanup old policies if you ever re-enable RLS
DROP POLICY IF EXISTS "Enable read access for all users" ON boq_definitions;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON boq_definitions;
DROP POLICY IF EXISTS "Enable read access for all users" ON boq_elements;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON boq_elements;

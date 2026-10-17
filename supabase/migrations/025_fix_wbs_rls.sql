-- Enable RLS on work_breakdown_structure
ALTER TABLE work_breakdown_structure ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing WBS (Authenticated & Anon)
CREATE POLICY "Enable read access for all users" ON work_breakdown_structure
    FOR SELECT
    USING (true);

-- Create policy for modifications (Authenticated active users)
CREATE POLICY "Enable insert/update/delete for authenticated users" ON work_breakdown_structure
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

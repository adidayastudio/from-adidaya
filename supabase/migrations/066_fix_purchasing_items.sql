-- Create purchasing_items table
CREATE TABLE IF NOT EXISTS purchasing_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES purchasing_requests(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    qty NUMERIC NOT NULL,
    unit TEXT,
    unit_price NUMERIC NOT NULL,
    total NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for purchasing_items
ALTER TABLE purchasing_items ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable read access for authenticated users"
ON purchasing_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert access for authenticated users"
ON purchasing_items FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users"
ON purchasing_items FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Enable delete access for authenticated users"
ON purchasing_items FOR DELETE
TO authenticated
USING (true);

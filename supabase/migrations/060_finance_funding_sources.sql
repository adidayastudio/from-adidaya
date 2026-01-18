-- Create funding_sources table
CREATE TABLE IF NOT EXISTS funding_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'BANK', 'PETTY_CASH', 'REIMBURSE', 'CREDIT_CARD'
    provider TEXT, -- 'MANDIRI', 'BCA', etc.
    currency TEXT DEFAULT 'IDR',
    balance NUMERIC DEFAULT 0,
    account_number TEXT,
    position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_funding_sources_workspace ON funding_sources(workspace_id);
CREATE INDEX IF NOT EXISTS idx_funding_sources_position ON funding_sources(position);

-- Enable RLS
ALTER TABLE funding_sources ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable read access for authenticated users"
ON funding_sources FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert access for authenticated users"
ON funding_sources FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users"
ON funding_sources FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Enable delete access for authenticated users"
ON funding_sources FOR DELETE
TO authenticated
USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_funding_sources_updated_at
    BEFORE UPDATE ON funding_sources
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

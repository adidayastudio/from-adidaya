-- Add project_id to funding_sources
ALTER TABLE funding_sources ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);

-- Create funding_source_transactions table
CREATE TABLE IF NOT EXISTS funding_source_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funding_source_id UUID NOT NULL REFERENCES funding_sources(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'TOP_UP', 'WITHDRAWAL', 'ADJUSTMENT'
    amount NUMERIC NOT NULL,
    description TEXT,
    reference_type TEXT, -- 'PURCHASE', 'REIMBURSE', 'MANUAL'
    reference_id UUID, -- Link to purchasing_requests or reimbursement_requests
    performed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_funding_source_transactions_source ON funding_source_transactions(funding_source_id);
CREATE INDEX IF NOT EXISTS idx_funding_source_transactions_ref ON funding_source_transactions(reference_id);

-- Enable RLS
ALTER TABLE funding_source_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for funding_source_transactions
CREATE POLICY "Enable read access for authenticated users"
ON funding_source_transactions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert access for authenticated users"
ON funding_source_transactions FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users"
ON funding_source_transactions FOR UPDATE
TO authenticated
USING (true);

-- Update updated_at trigger
CREATE TRIGGER update_funding_source_transactions_updated_at
    BEFORE UPDATE ON funding_source_transactions
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

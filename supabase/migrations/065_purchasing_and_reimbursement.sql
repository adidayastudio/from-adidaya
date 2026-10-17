-- Purchasing Requests Table
CREATE TABLE IF NOT EXISTS purchasing_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    vendor TEXT,
    description TEXT NOT NULL,
    quantity NUMERIC,
    unit TEXT,
    type TEXT NOT NULL CHECK (type IN ('MATERIAL', 'TOOL', 'SERVICE')),
    subcategory TEXT,
    amount NUMERIC NOT NULL,
    approval_status TEXT DEFAULT 'DRAFT' CHECK (approval_status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'PAID', 'REJECTED', 'CANCELLED')),
    purchase_stage TEXT DEFAULT 'PLANNED' CHECK (purchase_stage IN ('PLANNED', 'INVOICED', 'RECEIVED')),
    financial_status TEXT DEFAULT 'UNPAID' CHECK (financial_status IN ('NOT_PAYABLE', 'UNPAID', 'PAID')),
    source_of_fund_id UUID REFERENCES funding_sources(id),
    payment_date DATE,
    payment_proof_url TEXT,
    notes TEXT,
    rejection_reason TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reimbursement Requests Table
CREATE TABLE IF NOT EXISTS reimbursement_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    category TEXT NOT NULL CHECK (category IN ('TRANSPORTATION', 'MATERIAL', 'TOOLS', 'CONSUMPTION', 'ACCOMMODATION', 'OTHER')),
    date DATE NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'PAID', 'REJECTED', 'CANCELLED')),
    invoice_url TEXT,
    proof_of_payment_url TEXT,
    payment_date DATE,
    source_of_fund_id UUID REFERENCES funding_sources(id),
    notes TEXT,
    details JSONB DEFAULT '{}'::jsonb, -- Stores category-specific fields
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reimbursement Items Table
CREATE TABLE IF NOT EXISTS reimbursement_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reimbursement_id UUID REFERENCES reimbursement_requests(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    qty NUMERIC NOT NULL,
    unit TEXT,
    unit_price NUMERIC NOT NULL,
    total NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_purchasing_project ON purchasing_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_purchasing_status ON purchasing_requests(approval_status);
CREATE INDEX IF NOT EXISTS idx_reimburse_project ON reimbursement_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_reimburse_user ON reimbursement_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_reimburse_status ON reimbursement_requests(status);

-- Enable Row Level Security
ALTER TABLE purchasing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reimbursement_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reimbursement_items ENABLE ROW LEVEL SECURITY;

-- Policies for Purchasing Requests
CREATE POLICY "Enable read access for authenticated users"
ON purchasing_requests FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert access for authenticated users"
ON purchasing_requests FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users"
ON purchasing_requests FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Enable delete access for authenticated users"
ON purchasing_requests FOR DELETE
TO authenticated
USING (true);

-- Policies for Reimbursement Requests
CREATE POLICY "Enable read access for authenticated users"
ON reimbursement_requests FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert access for authenticated users"
ON reimbursement_requests FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users"
ON reimbursement_requests FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Enable delete access for authenticated users"
ON reimbursement_requests FOR DELETE
TO authenticated
USING (true);

-- Policies for Reimbursement Items
CREATE POLICY "Enable read access for authenticated users"
ON reimbursement_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert access for authenticated users"
ON reimbursement_items FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users"
ON reimbursement_items FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Enable delete access for authenticated users"
ON reimbursement_items FOR DELETE
TO authenticated
USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_purchasing_updated_at
    BEFORE UPDATE ON purchasing_requests
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_reimburse_updated_at
    BEFORE UPDATE ON reimbursement_requests
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Create boq_definitions table (Master Table)
CREATE TABLE IF NOT EXISTS boq_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    code TEXT,
    name TEXT NOT NULL,
    unit TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create boq_elements table (Variables/Components)
CREATE TABLE IF NOT EXISTS boq_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    definition_id UUID REFERENCES boq_definitions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    symbol TEXT, -- e.g. "L", "W", "H"
    unit TEXT,   -- e.g. "m", "m2"
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Comments
COMMENT ON TABLE boq_definitions IS 'Master library of Volume Formulas/Definitions (e.g. Concrete Box)';
COMMENT ON TABLE boq_elements IS 'Variables required for a BOQ Definition (e.g. Length, Width)';

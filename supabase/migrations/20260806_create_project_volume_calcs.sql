-- Create project_volume_calcs table
CREATE TABLE IF NOT EXISTS project_volume_calcs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    wbs_code TEXT NOT NULL,
    name TEXT NOT NULL,
    formula_type TEXT NOT NULL DEFAULT 'BOX', -- 'BOX' | 'TRAPEZOIDAL' | 'COLUMN_BEAM' | 'MANUAL'
    parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    calculated_volume NUMERIC(15,3) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE project_volume_calcs DISABLE ROW LEVEL SECURITY;

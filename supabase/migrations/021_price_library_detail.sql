-- Add discipline_id to ahsp_masters
ALTER TABLE ahsp_masters
ADD COLUMN IF NOT EXISTS discipline_id UUID REFERENCES disciplines(id) ON DELETE SET NULL;

-- Create work_breakdown_structure table if missing
CREATE TABLE IF NOT EXISTS work_breakdown_structure (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES work_breakdown_structure(id) ON DELETE CASCADE,
    code TEXT,
    name TEXT NOT NULL,
    description TEXT,
    level TEXT,
    indent_level INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add ahsp_id to work_breakdown_structure
ALTER TABLE work_breakdown_structure
ADD COLUMN IF NOT EXISTS ahsp_id UUID REFERENCES ahsp_masters(id) ON DELETE SET NULL;

COMMENT ON COLUMN ahsp_masters.discipline_id IS 'Discipline category for filtering AHSPs';
COMMENT ON COLUMN work_breakdown_structure.ahsp_id IS 'Reference to the assigned AHSP for this WBS Detail item';

-- Link WBS items to BOQ Definitions
ALTER TABLE work_breakdown_structure
ADD COLUMN IF NOT EXISTS boq_definition_id UUID REFERENCES boq_definitions(id) ON DELETE SET NULL;

COMMENT ON COLUMN work_breakdown_structure.boq_definition_id IS 'Reference to the Volume Formula/Definition used for this WBS item';

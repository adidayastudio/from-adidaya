-- Migration: Remove unit_basis check constraint
-- Purpose: Allow detailed unit basis (e.g. 'ha', 'ft2', 'cm2') which were previously restricted to 'm2', 'm3', 'ls'

ALTER TABLE cost_templates
DROP CONSTRAINT IF EXISTS cost_templates_unit_basis_check;

-- Optional: Add a verification comment
COMMENT ON COLUMN cost_templates.unit_basis IS 'Legacy main unit basis, now flexible. Detailed config in unit_config.';

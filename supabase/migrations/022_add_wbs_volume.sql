-- Add volume, unit, and notes to work_breakdown_structure table for BOQ
ALTER TABLE work_breakdown_structure
ADD COLUMN IF NOT EXISTS volume NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS unit TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN work_breakdown_structure.volume IS 'Quantity of work for BOQ/Estimates';
COMMENT ON COLUMN work_breakdown_structure.unit IS 'Unit of measurement (defaults to AHSP unit)';
COMMENT ON COLUMN work_breakdown_structure.notes IS 'Optional notes or remarks';

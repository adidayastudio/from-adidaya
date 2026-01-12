-- Add sort_order column to work_breakdown_structure
ALTER TABLE work_breakdown_structure 
ADD COLUMN IF NOT EXISTS sort_order FLOAT DEFAULT 0;

COMMENT ON COLUMN work_breakdown_structure.sort_order IS 'Order for sorting items (e.g. S=1, A=2)';

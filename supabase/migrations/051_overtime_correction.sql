-- Add approved start/end time columns to overtime_logs
-- This allows managers to correct the duration upon approval

ALTER TABLE overtime_logs 
ADD COLUMN IF NOT EXISTS approved_start_time TIME,
ADD COLUMN IF NOT EXISTS approved_end_time TIME;

-- Comment on columns
COMMENT ON COLUMN overtime_logs.approved_start_time IS 'Corrected start time set by manager upon approval';
COMMENT ON COLUMN overtime_logs.approved_end_time IS 'Corrected end time set by manager upon approval';

-- Add ot_target_hours to performance_rules
ALTER TABLE performance_rules 
ADD COLUMN IF NOT EXISTS ot_target_hours INTEGER DEFAULT 40;

COMMENT ON COLUMN performance_rules.ot_target_hours IS 'Monthly target for overtime bonus calculation (hours)';

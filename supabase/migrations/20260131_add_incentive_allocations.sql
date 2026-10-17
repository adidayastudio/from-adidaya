-- Add incentive allocation columns to performance_rules
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'performance_rules'
        AND column_name = 'incentive_allocation_project'
    ) THEN
        ALTER TABLE performance_rules ADD COLUMN incentive_allocation_project INTEGER DEFAULT 90;
        ALTER TABLE performance_rules ADD COLUMN incentive_allocation_performance INTEGER DEFAULT 10;
    END IF;
END $$;

-- Add auto_lock_enabled column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'performance_rules'
        AND column_name = 'auto_lock_enabled'
    ) THEN
        ALTER TABLE performance_rules ADD COLUMN auto_lock_enabled BOOLEAN DEFAULT true;
    END IF;
END $$;

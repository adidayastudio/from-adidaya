-- Add scoring_params column to performance_rules table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'performance_rules'
        AND column_name = 'scoring_params'
    ) THEN
        ALTER TABLE performance_rules ADD COLUMN scoring_params JSONB DEFAULT '{
            "attendance": {
                "late_penalty": 2,
                "max_late_penalty": 20
            },
            "task_quality": {
                "revision_deduction": 5,
                "max_deduction": 30
            }
        }'::jsonb;
    END IF;
END $$;

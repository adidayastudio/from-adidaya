-- Update incentive_role_weights to link with levels and support ranges
DO $$
BEGIN
    -- Add level_id if not exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'incentive_role_weights'
        AND column_name = 'level_id'
    ) THEN
        ALTER TABLE incentive_role_weights ADD COLUMN level_id UUID REFERENCES organization_levels(id);
    END IF;

    -- Add min/max weight columns
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'incentive_role_weights'
        AND column_name = 'min_weight'
    ) THEN
        ALTER TABLE incentive_role_weights ADD COLUMN min_weight NUMERIC(5,2) DEFAULT 0;
        ALTER TABLE incentive_role_weights ADD COLUMN max_weight NUMERIC(5,2) DEFAULT 0;
    END IF;
    
    -- Make role_name optional as it might be derived from level
    ALTER TABLE incentive_role_weights ALTER COLUMN role_name DROP NOT NULL;
    
    -- Drop constraint if exists (to allow duplicates if we use level_id instead, 
    -- but usually we want one rule per level_id. Let's add unique on level_id later or now)
    -- For now, we just relax role_name.
END $$;

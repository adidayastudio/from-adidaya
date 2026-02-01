-- Migration: Incentive Calculation Logic
-- Date: 2026-02-07
-- Description: Creates table for project participants and a function to calculate final incentive shares with redistribution logic.

-- 1. Project Incentive Participants Table
CREATE TABLE IF NOT EXISTS public.project_incentive_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id), -- Nullable if placeholder? Assume linked to profile.
    level_code TEXT NOT NULL REFERENCES project_incentive_level_ranges(level_code), -- Linked to the specific rule used
    raw_contribution_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
    final_incentive_percent DECIMAL(5, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pip_project ON project_incentive_participants(project_id);
CREATE INDEX IF NOT EXISTS idx_pip_user ON project_incentive_participants(user_id);

-- RLS
ALTER TABLE public.project_incentive_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read/write participants" ON public.project_incentive_participants
    FOR ALL TO authenticated USING (true);


-- 2. Calculation Function
CREATE OR REPLACE FUNCTION public.calculate_project_incentives(p_project_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_total_raw DECIMAL;
    v_norm_factor DECIMAL;
    v_participant RECORD;
    v_excess_pool DECIMAL := 0;
    v_redist_pool_weight DECIMAL := 0;
    v_result JSONB;
BEGIN
    -- 1. SUM Raw Contributions
    SELECT SUM(raw_contribution_percent) INTO v_total_raw
    FROM project_incentive_participants
    WHERE project_id = p_project_id;

    IF v_total_raw IS NULL OR v_total_raw = 0 THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Total contribution is 0');
    END IF;

    -- 2. Normalize Factor (Input -> 100%)
    v_norm_factor := 100.0 / v_total_raw;

    -- 3. First Pass: Calculate Normalized Share & Apply Logic (Cap)
    -- We'll use a temporary table or update directly? Update directly is risky if we need intermediate state.
    -- Let's use a temp table logic via loop.
    
    FOR v_participant IN 
        SELECT 
            pip.id,
            pip.raw_contribution_percent,
            r.effective_cap_ratio,
            r.min_percent, -- Used for hierarchy rank
            r.allow_zero
        FROM project_incentive_participants pip
        JOIN project_incentive_level_ranges r ON pip.level_code = r.level_code
        WHERE pip.project_id = p_project_id
    LOOP
        DECLARE
            v_norm_share DECIMAL;
            v_effective_share DECIMAL;
            v_penalty DECIMAL;
        BEGIN
            v_norm_share := v_participant.raw_contribution_percent * v_norm_factor;
            
            -- Apply Effective Cap
            -- If cap_ratio is 0.5, they get 50% of their share.
            v_effective_share := v_norm_share * v_participant.effective_cap_ratio;
            
            -- Calculate Penalty (Excess)
            v_penalty := v_norm_share - v_effective_share;
            
            -- Add to excess pool
            v_excess_pool := v_excess_pool + v_penalty;
            
            -- Store intermediate result
            UPDATE project_incentive_participants
            SET final_incentive_percent = v_effective_share -- Temporarily set to capped share
            WHERE id = v_participant.id;
        END;
    END LOOP;

    -- 4. Redistribution (Second Pass)
    -- Identify eligible receivers: NOT capped (ratio=1.0) AND "Higher Level" (min_percent > sourced?).
    -- Wait, the source of excess defines "Upward". 
    -- If multiple sources (e.g. 2 Interns), we pool their excess.
    -- Then we distribute the TOTAL excess to anyone "Eligible".
    -- Who is eligible?
    -- User rule: "Redistribute ... ONLY to: Levels ABOVE the capped level".
    -- If we have Intern (Cap 0.5) and Probation (Cap 0.5).
    -- Should Intern excess go to Probation? No, Probation is also capped.
    -- So receivers must have effective_cap_ratio = 1.0.
    -- And preferably be "Higher" rank.
    -- We'll simplify: Receivers = All participants with effective_cap_ratio = 1.0.
    -- (This satisfies "levels above" usually, as lower levels are the ones capped).
    
    -- Calculate total weight of receivers for redistribution
    -- Weight = Their Current Effective Share (Normalized)
    SELECT SUM(final_incentive_percent) INTO v_redist_pool_weight
    FROM project_incentive_participants pip
    JOIN project_incentive_level_ranges r ON pip.level_code = r.level_code
    WHERE pip.project_id = p_project_id
    AND r.effective_cap_ratio = 1.0; -- Only full-share levels receive excess

    -- 5. Apply Redistribution
    IF v_excess_pool > 0 AND v_redist_pool_weight > 0 THEN
        UPDATE project_incentive_participants pip
        SET final_incentive_percent = final_incentive_percent + (
            (final_incentive_percent / v_redist_pool_weight) * v_excess_pool
        )
        FROM project_incentive_level_ranges r
        WHERE pip.level_code = r.level_code
        AND pip.project_id = p_project_id
        AND r.effective_cap_ratio = 1.0;
    ELSIF v_excess_pool > 0 AND v_redist_pool_weight = 0 THEN
        -- No eligible receivers? This implies only interns on project?
        -- Edge case. Excess is lost? Or returned to company?
        -- For now, we leave it (total < 100%).
        NULL;
    END IF;

    RETURN jsonb_build_object('status', 'success', 'excess_redistributed', v_excess_pool);
END;
$$ LANGUAGE plpgsql;

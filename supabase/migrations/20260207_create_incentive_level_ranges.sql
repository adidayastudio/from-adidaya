-- Create table for Project Incentive Level Ranges
CREATE TABLE IF NOT EXISTS public.project_incentive_level_ranges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level_code TEXT NOT NULL,
    min_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
    max_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
    allow_zero BOOLEAN NOT NULL DEFAULT true,
    effective_cap_ratio DECIMAL(3, 2) DEFAULT 1.0, -- 1.0 means 100% effective (no reduction)
    redistribution_target TEXT, -- 'UPWARD' or specific level code
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.project_incentive_level_ranges ENABLE ROW LEVEL SECURITY;

-- Create policies (assuming public read/write for authenticated users for now, similar to other setup tables)
CREATE POLICY "Allow authenticated read access" ON public.project_incentive_level_ranges
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated write access" ON public.project_incentive_level_ranges
    FOR ALL TO authenticated USING (true);

-- Insert Data - Final Recommended Config
INSERT INTO public.project_incentive_level_ranges 
(level_code, min_percent, max_percent, allow_zero, effective_cap_ratio, redistribution_target, notes, is_active)
VALUES
-- INTERN / FREELANCE
('IN', 0, 3, true, 0.5, 'UPWARD', 'Intern / freelance. Max 50% of computed share. Excess redistributed upward.', true),

-- PROBATION
('PB', 0, 4, true, 0.5, 'UPWARD', 'Probation phase. Max 50% of computed share. Excess redistributed upward.', true),

-- JUNIOR
('JR', 2, 8, true, 1.0, NULL, 'Junior contributor. Full effective share.', true),

-- MIDDLE
('MD', 5, 12, true, 1.0, NULL, 'Middle level. Core execution role.', true),

-- SENIOR
('SR', 8, 18, true, 1.0, NULL, 'Senior contributor. Quality & speed driver.', true),

-- LEAD
('LD', 12, 25, true, 1.0, NULL, 'Lead role. Scope / sub-team owner.', true),

-- HEAD
('HD', 15, 30, true, 1.0, NULL, 'Head role. Cross-functional responsibility.', true),

-- PRINCIPAL
('PR', 20, 40, false, 1.0, NULL, 'Principal role. Strategic & decisive contributor.', true);

-- Add unique constraint on level_code to prevent duplicates
ALTER TABLE public.project_incentive_level_ranges ADD CONSTRAINT project_incentive_level_ranges_level_code_key UNIQUE (level_code);

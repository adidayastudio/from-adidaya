-- =============================================
-- PERFORMANCE & INCENTIVE SYSTEM SCHEMA
-- Implements separation of Performance Evaluation (Personal) and Incentive (Project-Based)
-- =============================================

-- 1. PERFORMANCE RULES (Versioned Configuration)
-- Stores the weighting logic and evaluation period settings.
-- Designed to be append-only for versioning (latest effective_start_date wins).
CREATE TABLE IF NOT EXISTS performance_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    effective_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Tab 1: Weighting Configuration (Must sum to 100 in app logic, enforced loosely here to allow draft)
    weight_attendance INTEGER NOT NULL DEFAULT 25,
    weight_task_completion INTEGER NOT NULL DEFAULT 25,
    weight_task_quality INTEGER NOT NULL DEFAULT 25,
    weight_peer_review INTEGER NOT NULL DEFAULT 25,
    
    overtime_bonus_enabled BOOLEAN DEFAULT false,
    overtime_max_bonus INTEGER DEFAULT 10, -- e.g. 10%
    
    -- Tab 2: Evaluation Period
    period_type TEXT NOT NULL DEFAULT 'monthly' CHECK (period_type IN ('weekly', 'monthly')),
    snapshot_day_trigger TEXT NOT NULL DEFAULT '1', -- '1', '15', 'last', 'monday'
    auto_lock_enabled BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true
);

-- Index for finding the latest rule
CREATE INDEX idx_performance_rules_date ON performance_rules(effective_start_date DESC);

-- 2. INCENTIVE ROLE WEIGHTS (Global Configuration)
-- Defines the weight/multiplier for different project roles (e.g., Lead=2.0, Support=1.0).
CREATE TABLE IF NOT EXISTS incentive_role_weights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name TEXT NOT NULL UNIQUE,
    weight_points NUMERIC(5,2) NOT NULL DEFAULT 1.0,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed Initial Roles
INSERT INTO incentive_role_weights (role_name, weight_points, sort_order, description) VALUES
('Principal / Lead', 2.0, 10, 'Overall responsibility for project success'),
('PIC / Coordinator', 1.5, 20, 'Manages specific aspect or phase'),
('Contributor / Support', 1.0, 30, 'Executes assigned tasks'),
('Observer', 0.0, 40, 'Monitoring only, no direct output')
ON CONFLICT (role_name) DO NOTHING;

-- 3. PROJECT INCENTIVE POOLS
-- Stores the dedicated incentive money per project.
-- IF pool_amount IS 0, THEN INCENTIVE IS 0 FOR EVERYONE.
CREATE TABLE IF NOT EXISTS project_incentive_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_code TEXT NOT NULL, -- Text reference to matches projects(project_code)
    
    pool_amount NUMERIC(15,2) DEFAULT 0 CHECK (pool_amount >= 0),
    is_active BOOLEAN DEFAULT true, -- If false, calculation is skipped
    
    -- Breakdown (Info only, calculated by app)
    calculated_contribution_share NUMERIC(15,2) DEFAULT 0, -- 90%
    calculated_performance_share NUMERIC(15,2) DEFAULT 0, -- 10%
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_project_incentive_pools_code ON project_incentive_pools(project_code);

-- RLS POLICIES
ALTER TABLE performance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE incentive_role_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_incentive_pools ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read performance_rules" ON performance_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read incentive_role_weights" ON incentive_role_weights FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read project_incentive_pools" ON project_incentive_pools FOR SELECT TO authenticated USING (true);

-- Allow write access (For now, allow authenticated to configure. In prod, restrict to Admins)
CREATE POLICY "Allow write performance_rules" ON performance_rules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update performance_rules" ON performance_rules FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow write incentive_role_weights" ON incentive_role_weights FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update incentive_role_weights" ON incentive_role_weights FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow delete incentive_role_weights" ON incentive_role_weights FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow write project_incentive_pools" ON project_incentive_pools FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update project_incentive_pools" ON project_incentive_pools FOR UPDATE TO authenticated USING (true);

-- Update Trigger for Role Weights
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_incentive_roles_updated_at ON incentive_role_weights;
CREATE TRIGGER update_incentive_roles_updated_at BEFORE UPDATE ON incentive_role_weights FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_pools_updated_at ON project_incentive_pools;
CREATE TRIGGER update_project_pools_updated_at BEFORE UPDATE ON project_incentive_pools FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

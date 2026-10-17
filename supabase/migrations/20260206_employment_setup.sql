-- Migration: Employment Setup
-- Date: 2026-02-06
-- Description: Implements Employment Types, Work Status, and Employment Policies.

-- 1. Employment Types
CREATE TABLE IF NOT EXISTS employment_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    min_level_code INTEGER DEFAULT 0, -- Reference to organization_levels.level_code
    max_level_code INTEGER DEFAULT 5,
    is_default BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Archived')),
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Work Status
CREATE TABLE IF NOT EXISTS work_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#3B82F6', -- Default blue
    visibility TEXT DEFAULT 'Public' CHECK (visibility IN ('Public', 'Team Only', 'Private')),
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Archived')),
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Employment Policies
CREATE TABLE IF NOT EXISTS employment_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employment_type_id UUID REFERENCES employment_types(id) ON DELETE CASCADE UNIQUE,
    default_working_hours NUMERIC(5,2) DEFAULT 40,
    overtime_eligible BOOLEAN DEFAULT FALSE,
    benefits_eligible BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Update Profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS employment_type_id UUID REFERENCES employment_types(id),
ADD COLUMN IF NOT EXISTS work_status_id UUID REFERENCES work_status(id);

-- 5. Enable RLS
ALTER TABLE employment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE employment_policies ENABLE ROW LEVEL SECURITY;

-- 6. Policies (Viewable by authenticated, Manageable by Admin/HR/Supervisor)
DROP POLICY IF EXISTS "View Employment Types" ON employment_types;
CREATE POLICY "View Employment Types" ON employment_types FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "View Work Status" ON work_status;
CREATE POLICY "View Work Status" ON work_status FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "View Employment Policies" ON employment_policies;
CREATE POLICY "View Employment Policies" ON employment_policies FOR SELECT USING (auth.role() = 'authenticated');

-- Management Policies (Restrict to managers)
-- Reusing the logic from other tables: role::text IN ('admin', 'supervisor', 'superadmin', 'hr')
CREATE POLICY "Manage Employment Types" ON employment_types 
FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'supervisor', 'superadmin', 'hr'))
);

CREATE POLICY "Manage Work Status" ON work_status 
FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'supervisor', 'superadmin', 'hr'))
);

CREATE POLICY "Manage Employment Policies" ON employment_policies 
FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'supervisor', 'superadmin', 'hr'))
);

-- 7. Seed Data
INSERT INTO employment_types (name, min_level_code, max_level_code, order_index, is_default) VALUES
('Full-Time', 2, 5, 1, TRUE),
('Contract', 2, 5, 2, FALSE),
('Probation', 1, 1, 3, FALSE),
('Internship', 0, 0, 4, FALSE),
('Freelance', 0, 0, 5, FALSE),
('Outsource', 0, 0, 6, FALSE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO work_status (name, color, visibility, order_index) VALUES
('Active', '#10B981', 'Public', 1),
('On Leave', '#F59E0B', 'Team Only', 2),
('Inactive', '#6B7280', 'Private', 3)
ON CONFLICT (name) DO NOTHING;

-- Seed Policies for default types
DO $$
DECLARE
    v_type_id UUID;
BEGIN
    -- Full-Time
    SELECT id INTO v_type_id FROM employment_types WHERE name = 'Full-Time';
    INSERT INTO employment_policies (employment_type_id, default_working_hours, overtime_eligible, benefits_eligible)
    VALUES (v_type_id, 40, TRUE, TRUE) ON CONFLICT (employment_type_id) DO NOTHING;

    -- Contract
    SELECT id INTO v_type_id FROM employment_types WHERE name = 'Contract';
    INSERT INTO employment_policies (employment_type_id, default_working_hours, overtime_eligible, benefits_eligible)
    VALUES (v_type_id, 40, TRUE, FALSE) ON CONFLICT (employment_type_id) DO NOTHING;

    -- Probation
    SELECT id INTO v_type_id FROM employment_types WHERE name = 'Probation';
    INSERT INTO employment_policies (employment_type_id, default_working_hours, overtime_eligible, benefits_eligible)
    VALUES (v_type_id, 40, TRUE, FALSE) ON CONFLICT (employment_type_id) DO NOTHING;

    -- Internship
    SELECT id INTO v_type_id FROM employment_types WHERE name = 'Internship';
    INSERT INTO employment_policies (employment_type_id, default_working_hours, overtime_eligible, benefits_eligible)
    VALUES (v_type_id, 40, FALSE, FALSE) ON CONFLICT (employment_type_id) DO NOTHING;

    -- Freelance
    SELECT id INTO v_type_id FROM employment_types WHERE name = 'Freelance';
    INSERT INTO employment_policies (employment_type_id, default_working_hours, overtime_eligible, benefits_eligible)
    VALUES (v_type_id, 0, TRUE, FALSE) ON CONFLICT (employment_type_id) DO NOTHING;

    -- Outsource
    SELECT id INTO v_type_id FROM employment_types WHERE name = 'Outsource';
    INSERT INTO employment_policies (employment_type_id, default_working_hours, overtime_eligible, benefits_eligible)
    VALUES (v_type_id, 40, TRUE, FALSE) ON CONFLICT (employment_type_id) DO NOTHING;
END $$;

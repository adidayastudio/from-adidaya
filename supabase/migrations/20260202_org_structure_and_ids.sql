-- Migration: Organization Structure & Employee IDs
-- Date: 2026-02-02
-- Description: Implements Departments, Positions, Levels, and Employee ID generation system.

-- 1. Organization Departments
CREATE TABLE IF NOT EXISTS organization_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE, -- e.g., '1-AID'
    cluster_code INTEGER NOT NULL DEFAULT 0 CHECK (cluster_code BETWEEN 0 AND 9), -- The numeric part of the code
    name TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Archived')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Organization Positions
CREATE TABLE IF NOT EXISTS organization_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE, -- e.g., 'AR'
    name TEXT NOT NULL,
    department_id UUID REFERENCES organization_departments(id) ON DELETE RESTRICT,
    category_code INTEGER NOT NULL CHECK (category_code BETWEEN 1 AND 9), -- Digit 3 of System ID (Contextual per dept)
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Archived')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(department_id, category_code) -- Ensure unique position code within a department context
);

-- 3. Organization Levels
CREATE TABLE IF NOT EXISTS organization_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE, -- e.g., '001 I JR'
    name TEXT NOT NULL,
    level_code INTEGER NOT NULL CHECK (level_code BETWEEN 0 AND 5), -- Digit 1 context (mapped conceptually)
    roman_code TEXT NOT NULL, -- I, II, III, IV, V
    order_index INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Archived')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Employee Sequences (Global)
CREATE TABLE IF NOT EXISTS employee_sequences (
    id INTEGER PRIMARY KEY DEFAULT 1,
    last_sequence INTEGER DEFAULT 0
);
INSERT INTO employee_sequences (id, last_sequence) VALUES (1, 0) ON CONFLICT DO NOTHING;

-- 5. Update Profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS system_id TEXT UNIQUE, -- 8-digit immutable ID
ADD COLUMN IF NOT EXISTS display_id TEXT, -- Human readable ID
ADD COLUMN IF NOT EXISTS join_date DATE,
ADD COLUMN IF NOT EXISTS employment_track INTEGER CHECK (employment_track BETWEEN 0 AND 5), -- Digit 1
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES organization_departments(id),
ADD COLUMN IF NOT EXISTS position_id UUID REFERENCES organization_positions(id),
ADD COLUMN IF NOT EXISTS level_id UUID REFERENCES organization_levels(id);

-- 6. Indexes & RLS
CREATE INDEX IF NOT EXISTS idx_org_pos_dept ON organization_positions(department_id);
CREATE INDEX IF NOT EXISTS idx_profiles_system_id ON profiles(system_id);

ALTER TABLE organization_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_levels ENABLE ROW LEVEL SECURITY;

-- Policies (Viewable by authenticated, Manageable by Admin/HR)
DROP POLICY IF EXISTS "View Departments" ON organization_departments;
CREATE POLICY "View Departments" ON organization_departments FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "View Positions" ON organization_positions;
CREATE POLICY "View Positions" ON organization_positions FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "View Levels" ON organization_levels;
CREATE POLICY "View Levels" ON organization_levels FOR SELECT USING (auth.role() = 'authenticated');

-- 7. Functions

-- Function: Generate System ID
CREATE OR REPLACE FUNCTION generate_system_id(
    p_employment_track INTEGER,
    p_dept_cluster INTEGER,
    p_pos_category INTEGER,
    p_join_date DATE
) RETURNS TEXT AS $$
DECLARE
    v_year_suffix TEXT;
    v_sequence INTEGER;
    v_seq_str TEXT;
    v_system_id TEXT;
BEGIN
    -- Digit 1: Employment Track (passed in)
    -- Digit 2: Dept Cluster (passed in)
    -- Digit 3: Pos Category (passed in)
    
    -- Digit 4-5: Year suffix
    v_year_suffix := TO_CHAR(p_join_date, 'YY');
    
    -- Digit 6-8: Global Sequence
    UPDATE employee_sequences SET last_sequence = last_sequence + 1 WHERE id = 1 RETURNING last_sequence INTO v_sequence;
    v_seq_str := LPAD(v_sequence::TEXT, 3, '0');
    
    v_system_id := p_employment_track || p_dept_cluster || p_pos_category || v_year_suffix || v_seq_str;
    
    RETURN v_system_id;
END;
$$ LANGUAGE plpgsql;

-- Clear existing to ensure clean seed with new formats
TRUNCATE organization_departments, organization_positions, organization_levels RESTART IDENTITY CASCADE;

INSERT INTO organization_departments (code, cluster_code, name, order_index) VALUES
('1-AID', 1, 'Architecture, Interior, and Design', 1),
('2-SMP', 2, 'Structure and MEP Engineering', 2),
('3-UDL', 3, 'Urban Design and Landscape', 3),
('4-HFR', 4, 'Human Capital, Finance, and Resources', 4),
('5-PCC', 5, 'Procurement and Construction', 5),
('6-RBD', 6, 'Research and Business Development', 6);

-- Levels
INSERT INTO organization_levels (code, name, level_code, roman_code, order_index) VALUES
('000 0 INT', 'Internship / Freelance', 0, '0', 0),
('001 I JR', 'Junior', 1, 'I', 1),
('002 II MD', 'Mid', 2, 'II', 2),
('003 III SR', 'Senior', 3, 'III', 3),
('004 IV LD', 'Lead', 4, 'IV', 4),
('005 V PR', 'Principal', 5, 'V', 5)
ON CONFLICT (code) DO NOTHING;

-- Positions (AID)
DO $$
DECLARE
    v_dept_id UUID;
BEGIN
    SELECT id INTO v_dept_id FROM organization_departments WHERE code = '1-AID';
    IF FOUND THEN
        INSERT INTO organization_positions (code, name, department_id, category_code) VALUES
        ('AR', 'Architect', v_dept_id, 1),
        ('AD', 'Architectural Designer', v_dept_id, 2),
        ('ID', 'Interior Designer', v_dept_id, 3),
        ('GD', 'Graphic Designer', v_dept_id, 4)
        ON CONFLICT (code) DO NOTHING;
    END IF;

    SELECT id INTO v_dept_id FROM organization_departments WHERE code = '2-SMP';
    IF FOUND THEN
        INSERT INTO organization_positions (code, name, department_id, category_code) VALUES
        ('ST', 'Structural Engineer', v_dept_id, 1),
        ('ME', 'MEP Engineer', v_dept_id, 2),
        ('DF', 'Drafter', v_dept_id, 3)
        ON CONFLICT (code) DO NOTHING;
    END IF;

    SELECT id INTO v_dept_id FROM organization_departments WHERE code = '3-UDL';
    IF FOUND THEN
         INSERT INTO organization_positions (code, name, department_id, category_code) VALUES
        ('UD', 'Urban Designer', v_dept_id, 1),
        ('LD', 'Landscape Designer', v_dept_id, 2)
        ON CONFLICT (code) DO NOTHING;
    END IF;

    SELECT id INTO v_dept_id FROM organization_departments WHERE code = '4-HFR';
    IF FOUND THEN
         INSERT INTO organization_positions (code, name, department_id, category_code) VALUES
        ('HC', 'Human Capital Officer', v_dept_id, 1),
        ('FI', 'Finance Officer', v_dept_id, 2)
        ON CONFLICT (code) DO NOTHING;
    END IF;

    SELECT id INTO v_dept_id FROM organization_departments WHERE code = '5-PCC';
    IF FOUND THEN
         INSERT INTO organization_positions (code, name, department_id, category_code) VALUES
        ('PC', 'Procurement Officer', v_dept_id, 1),
        ('SM', 'Site Manager', v_dept_id, 2),
        ('PM', 'Project Manager', v_dept_id, 3)
        ON CONFLICT (code) DO NOTHING;
    END IF;

    SELECT id INTO v_dept_id FROM organization_departments WHERE code = '6-RBD';
    IF FOUND THEN
         INSERT INTO organization_positions (code, name, department_id, category_code) VALUES
        ('RS', 'Researcher', v_dept_id, 1),
        ('BD', 'Business Development Officer', v_dept_id, 2),
        ('SS', 'Social Media Specialist', v_dept_id, 3),
        ('IT', 'IT Development Officer', v_dept_id, 4)
        ON CONFLICT (code) DO NOTHING;
    END IF;
END $$;

-- 8. Helper Function: Generate Display ID components
CREATE OR REPLACE FUNCTION calculate_display_id(
    p_system_id TEXT,
    p_dept_id UUID,
    p_pos_id UUID,
    p_level_id UUID
) RETURNS TEXT AS $$
DECLARE
    v_dept_code TEXT;
    v_pos_code TEXT;
    v_level_roman TEXT;
    v_year TEXT;
    v_sequence TEXT;
    v_display_id TEXT;
BEGIN
    IF p_system_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Fetch codes
    SELECT SPLIT_PART(code, '-', 2) INTO v_dept_code FROM organization_departments WHERE id = p_dept_id;
    SELECT code INTO v_pos_code FROM organization_positions WHERE id = p_pos_id;
    SELECT roman_code INTO v_level_roman FROM organization_levels WHERE id = p_level_id;
    
    -- Fallback/Defaults
    v_dept_code := COALESCE(v_dept_code, 'UNK');
    v_pos_code := COALESCE(v_pos_code, 'UNK');
    v_level_roman := COALESCE(v_level_roman, 'I');

    -- Extract from System ID
    -- Format: [1][1][1][22][001]
    -- Digits 4-5 are index 4,5 (1-based in SQL substring? Yes)
    -- Wait, 1+1+1 = 3 chars. 4-5 are chars 4 and 5.
    v_year := '20' || SUBSTRING(p_system_id FROM 4 FOR 2);
    v_sequence := SUBSTRING(p_system_id FROM 6 FOR 3);

    -- Format: ADY-[LEVEL]-[DEPT][POS]-[YEAR][SEQ]
    v_display_id := 'ADY-' || v_level_roman || '-' || v_dept_code || v_pos_code || '-' || v_year || v_sequence;

    RETURN v_display_id;
END;
$$ LANGUAGE plpgsql;

-- 9. Trigger to auto-update Display ID
CREATE OR REPLACE FUNCTION update_display_id_trigger_func() RETURNS TRIGGER AS $$
BEGIN
    -- Only update if relevant fields change or if display_id is null but system_id exists
    IF (TG_OP = 'UPDATE' AND (
        NEW.department_id IS DISTINCT FROM OLD.department_id OR
        NEW.position_id IS DISTINCT FROM OLD.position_id OR
        NEW.level_id IS DISTINCT FROM OLD.level_id OR
        NEW.system_id IS DISTINCT FROM OLD.system_id
    )) OR (NEW.system_id IS NOT NULL AND NEW.display_id IS NULL) THEN
        
        NEW.display_id := calculate_display_id(
            NEW.system_id,
            NEW.department_id,
            NEW.position_id,
            NEW.level_id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_display_id ON profiles;
CREATE TRIGGER trg_update_display_id
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_display_id_trigger_func();

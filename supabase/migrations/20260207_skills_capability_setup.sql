-- Migration: Skills & Capability Setup
-- Date: 2026-02-07
-- Description: Adds tables for Skill Categories, Skill Library, and related metadata.

-- 1. Skill Categories
CREATE TABLE IF NOT EXISTS skill_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    status TEXT CHECK (status IN ('active', 'archived')) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Skill Library
CREATE TABLE IF NOT EXISTS skill_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category_id UUID REFERENCES skill_categories(id) ON DELETE RESTRICT, -- Prevent deleting category if used
    status TEXT CHECK (status IN ('active', 'draft', 'archived')) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(name, category_id)
);

-- 3. Related Departments (Multi-select)
-- Note: We store department names directly as "tags" for now or link to known departments if available.
-- Given the requirement "Related departments/positions are used for suggestion only", simple text storage or a relation table is fine.
-- We'll use a relation table for cleaner querying.
CREATE TABLE IF NOT EXISTS skill_related_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID REFERENCES skill_library(id) ON DELETE CASCADE NOT NULL,
    department_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(skill_id, department_name)
);

-- 4. Related Positions (Multi-select)
CREATE TABLE IF NOT EXISTS skill_related_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID REFERENCES skill_library(id) ON DELETE CASCADE NOT NULL,
    position_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(skill_id, position_name)
);

-- 5. Enable RLS
ALTER TABLE skill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_related_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_related_positions ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
-- Managers (Admin, HR, Supervisor, Superadmin) can MANAGE everything.
-- Staff can READ everything (to select skills).

-- Helper policy for Managers
DO $$ BEGIN
  CREATE POLICY "managers_manage_skill_categories" ON skill_categories
      USING (
          EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'supervisor', 'superadmin', 'hr'))
      );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "managers_manage_skill_library" ON skill_library
      USING (
          EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'supervisor', 'superadmin', 'hr'))
      );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "managers_manage_skill_depts" ON skill_related_departments
      USING (
          EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'supervisor', 'superadmin', 'hr'))
      );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "managers_manage_skill_positions" ON skill_related_positions
      USING (
          EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'supervisor', 'superadmin', 'hr'))
      );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Helper policy for Staff (Read Only)
DO $$ BEGIN
  CREATE POLICY "staff_view_skill_categories" ON skill_categories
      FOR SELECT USING (true); -- Public read to authenticated users
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "staff_view_skill_library" ON skill_library
      FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "staff_view_skill_depts" ON skill_related_departments
      FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "staff_view_skill_positions" ON skill_related_positions
      FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- 7. Seed Data
DO $$
DECLARE
    -- Category IDs
    cat_design UUID;
    cat_technical UUID;
    cat_software UUID;
    cat_construction UUID;
    cat_project UUID;
    cat_research UUID;
    cat_comms UUID;
    cat_finance UUID;
    cat_digital UUID;
    
    -- Skill IDs (temp)
    s_id UUID;
BEGIN
    -- Insert Categories
    INSERT INTO skill_categories (name, description) VALUES
        ('Design & Concept', 'Architectural and interior design capabilities'),
        ('Technical & Engineering', 'Structural and MEP engineering skills'),
        ('Software & Tools', 'Proficiency in design and management software'),
        ('Construction & Site', 'On-site management and construction supervision'),
        ('Project & Management', 'Project planning and team leadership'),
        ('Research & Analysis', 'Data collection and feasibility studies'),
        ('Communication & Media', 'Visual and verbal communication skills'),
        ('Finance & Administration', 'Budgeting and administrative management'),
        ('Digital & IT', 'Information technology and system support')
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO s_id; -- Just to handle the return, we'll fetch IDs below

    -- Fetch IDs for seeding
    SELECT id INTO cat_design FROM skill_categories WHERE name = 'Design & Concept';
    SELECT id INTO cat_technical FROM skill_categories WHERE name = 'Technical & Engineering';
    SELECT id INTO cat_software FROM skill_categories WHERE name = 'Software & Tools';
    SELECT id INTO cat_construction FROM skill_categories WHERE name = 'Construction & Site';
    SELECT id INTO cat_project FROM skill_categories WHERE name = 'Project & Management';
    SELECT id INTO cat_research FROM skill_categories WHERE name = 'Research & Analysis';
    SELECT id INTO cat_comms FROM skill_categories WHERE name = 'Communication & Media';
    SELECT id INTO cat_finance FROM skill_categories WHERE name = 'Finance & Administration';
    SELECT id INTO cat_digital FROM skill_categories WHERE name = 'Digital & IT';

    -- --- Design & Concept ---
    IF cat_design IS NOT NULL THEN
        -- Insert Skills
        FOREACH s_id IN ARRAY ARRAY(
            INSERT INTO skill_library (name, category_id) VALUES
                ('Architectural Design', cat_design),
                ('Interior Design', cat_design),
                ('Space Planning', cat_design),
                ('Concept Development', cat_design),
                ('Design Presentation', cat_design),
                ('Visual Storytelling', cat_design)
            ON CONFLICT (name, category_id) DO NOTHING
            RETURNING id
        ) LOOP
            -- Related Departments
            INSERT INTO skill_related_departments (skill_id, department_name) VALUES
                (s_id, 'Architecture, Interior, and Design'),
                (s_id, 'Urban Design and Landscape')
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- --- Technical & Engineering ---
    IF cat_technical IS NOT NULL THEN
        FOREACH s_id IN ARRAY ARRAY(
            INSERT INTO skill_library (name, category_id) VALUES
                ('Structural Analysis', cat_technical),
                ('MEP System Design', cat_technical),
                ('Construction Detailing', cat_technical),
                ('Shop Drawing Review', cat_technical),
                ('Material Specification', cat_technical)
            ON CONFLICT (name, category_id) DO NOTHING
            RETURNING id
        ) LOOP
            INSERT INTO skill_related_departments (skill_id, department_name) VALUES
                (s_id, 'Structure and MEP Engineering'),
                (s_id, 'Procurement and Construction')
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- --- Software & Tools ---
    IF cat_software IS NOT NULL THEN
        FOREACH s_id IN ARRAY ARRAY(
            INSERT INTO skill_library (name, category_id) VALUES
                ('AutoCAD', cat_software),
                ('SketchUp', cat_software),
                ('Archicad', cat_software),
                ('Revit', cat_software),
                ('Rhino', cat_software),
                ('Enscape / Lumion', cat_software),
                ('Microsoft Excel', cat_software),
                ('Project Management Tools', cat_software)
            ON CONFLICT (name, category_id) DO NOTHING
            RETURNING id
        ) LOOP
            INSERT INTO skill_related_positions (skill_id, position_name) VALUES
                (s_id, 'Architect'),
                (s_id, 'Architectural Designer'),
                (s_id, 'Structural Engineer'),
                (s_id, 'Drafter'),
                (s_id, 'Project Manager')
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- --- Construction & Site ---
    IF cat_construction IS NOT NULL THEN
        FOREACH s_id IN ARRAY ARRAY(
            INSERT INTO skill_library (name, category_id) VALUES
                ('Site Supervision', cat_construction),
                ('Construction Scheduling', cat_construction),
                ('Quality Control', cat_construction),
                ('Safety Management (K3)', cat_construction),
                ('BOQ & Cost Control', cat_construction)
            ON CONFLICT (name, category_id) DO NOTHING
            RETURNING id
        ) LOOP
            INSERT INTO skill_related_positions (skill_id, position_name) VALUES
                (s_id, 'Site Manager'),
                (s_id, 'Procurement Officer'),
                (s_id, 'Project Manager')
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- --- Project & Management ---
    IF cat_project IS NOT NULL THEN
        FOREACH s_id IN ARRAY ARRAY(
            INSERT INTO skill_library (name, category_id) VALUES
                ('Project Planning', cat_project),
                ('Team Coordination', cat_project),
                ('Risk Management', cat_project),
                ('Client Management', cat_project),
                ('Decision Making', cat_project)
            ON CONFLICT (name, category_id) DO NOTHING
            RETURNING id
        ) LOOP
            INSERT INTO skill_related_positions (skill_id, position_name) VALUES
                (s_id, 'Project Manager'),
                (s_id, 'Supervisor'),
                (s_id, 'Lead Roles')
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

     -- --- Research & Analysis ---
    IF cat_research IS NOT NULL THEN
        FOREACH s_id IN ARRAY ARRAY(
            INSERT INTO skill_library (name, category_id) VALUES
                ('Design Research', cat_research),
                ('Feasibility Study', cat_research),
                ('Site Analysis', cat_research),
                ('Market Research', cat_research),
                ('Data Analysis', cat_research)
            ON CONFLICT (name, category_id) DO NOTHING
            RETURNING id
        ) LOOP
            INSERT INTO skill_related_departments (skill_id, department_name) VALUES
                (s_id, 'Research and Business Development'),
                (s_id, 'Urban Design and Landscape')
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- --- Communication & Media ---
    IF cat_comms IS NOT NULL THEN
        FOREACH s_id IN ARRAY ARRAY(
            INSERT INTO skill_library (name, category_id) VALUES
                ('Graphic Design', cat_comms),
                ('Branding', cat_comms),
                ('Social Media Management', cat_comms),
                ('Presentation Design', cat_comms),
                ('Copywriting', cat_comms)
            ON CONFLICT (name, category_id) DO NOTHING
            RETURNING id
        ) LOOP
            INSERT INTO skill_related_positions (skill_id, position_name) VALUES
                (s_id, 'Graphics Designer'),
                (s_id, 'Social Media Specialist'),
                (s_id, 'Business Development Officer')
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- --- Finance & Administration ---
    IF cat_finance IS NOT NULL THEN
        FOREACH s_id IN ARRAY ARRAY(
            INSERT INTO skill_library (name, category_id) VALUES
                ('Budgeting', cat_finance),
                ('Financial Reporting', cat_finance),
                ('Payroll Administration', cat_finance),
                ('Procurement Administration', cat_finance),
                ('Contract Management', cat_finance)
            ON CONFLICT (name, category_id) DO NOTHING
            RETURNING id
        ) LOOP
            INSERT INTO skill_related_departments (skill_id, department_name) VALUES
                (s_id, 'Human Capital, Finance, and Resources'),
                (s_id, 'Procurement and Construction')
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- --- Digital & IT ---
    IF cat_digital IS NOT NULL THEN
        FOREACH s_id IN ARRAY ARRAY(
            INSERT INTO skill_library (name, category_id) VALUES
                ('System Administration', cat_digital),
                ('Web Development', cat_digital),
                ('Database Management', cat_digital),
                ('Automation & Integration', cat_digital),
                ('IT Support', cat_digital)
            ON CONFLICT (name, category_id) DO NOTHING
            RETURNING id
        ) LOOP
            INSERT INTO skill_related_positions (skill_id, position_name) VALUES
                (s_id, 'IT Development Officer')
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

END $$;

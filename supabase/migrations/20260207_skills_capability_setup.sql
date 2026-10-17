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
    cat_id UUID;
    
    -- Skill IDs (temp)
    s_id UUID;
    skill_name TEXT;
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
    ON CONFLICT (name) DO NOTHING;

    -- --- Design & Concept ---
    SELECT id INTO cat_id FROM skill_categories WHERE name = 'Design & Concept';
    IF cat_id IS NOT NULL THEN
        FOREACH skill_name IN ARRAY ARRAY['Architectural Design', 'Interior Design', 'Space Planning', 'Concept Development', 'Design Presentation', 'Visual Storytelling']
        LOOP
            INSERT INTO skill_library (name, category_id) VALUES (skill_name, cat_id)
            ON CONFLICT (name, category_id) DO UPDATE SET updated_at = now()
            RETURNING id INTO s_id;
            
            IF s_id IS NULL THEN
                SELECT id INTO s_id FROM skill_library WHERE name = skill_name AND category_id = cat_id;
            END IF;

            INSERT INTO skill_related_departments (skill_id, department_name) VALUES
                (s_id, 'Architecture, Interior, and Design'),
                (s_id, 'Urban Design and Landscape')
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- --- Technical & Engineering ---
    SELECT id INTO cat_id FROM skill_categories WHERE name = 'Technical & Engineering';
    IF cat_id IS NOT NULL THEN
        FOREACH skill_name IN ARRAY ARRAY['Structural Analysis', 'MEP System Design', 'Construction Detailing', 'Shop Drawing Review', 'Material Specification']
        LOOP
            INSERT INTO skill_library (name, category_id) VALUES (skill_name, cat_id)
            ON CONFLICT (name, category_id) DO UPDATE SET updated_at = now()
            RETURNING id INTO s_id;
            
            IF s_id IS NULL THEN
                 SELECT id INTO s_id FROM skill_library WHERE name = skill_name AND category_id = cat_id;
            END IF;

            INSERT INTO skill_related_departments (skill_id, department_name) VALUES
                (s_id, 'Structure and MEP Engineering'),
                (s_id, 'Procurement and Construction')
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- --- Software & Tools ---
    SELECT id INTO cat_id FROM skill_categories WHERE name = 'Software & Tools';
    IF cat_id IS NOT NULL THEN
        FOREACH skill_name IN ARRAY ARRAY['AutoCAD', 'SketchUp', 'Archicad', 'Revit', 'Rhino', 'Enscape / Lumion', 'Microsoft Excel', 'Project Management Tools']
        LOOP
            INSERT INTO skill_library (name, category_id) VALUES (skill_name, cat_id)
            ON CONFLICT (name, category_id) DO UPDATE SET updated_at = now()
            RETURNING id INTO s_id;
             
            IF s_id IS NULL THEN
                 SELECT id INTO s_id FROM skill_library WHERE name = skill_name AND category_id = cat_id;
            END IF;

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
    SELECT id INTO cat_id FROM skill_categories WHERE name = 'Construction & Site';
    IF cat_id IS NOT NULL THEN
        FOREACH skill_name IN ARRAY ARRAY['Site Supervision', 'Construction Scheduling', 'Quality Control', 'Safety Management (K3)', 'BOQ & Cost Control']
        LOOP
            INSERT INTO skill_library (name, category_id) VALUES (skill_name, cat_id)
            ON CONFLICT (name, category_id) DO UPDATE SET updated_at = now()
            RETURNING id INTO s_id;
            
             IF s_id IS NULL THEN
                 SELECT id INTO s_id FROM skill_library WHERE name = skill_name AND category_id = cat_id;
            END IF;

            INSERT INTO skill_related_positions (skill_id, position_name) VALUES
                (s_id, 'Site Manager'),
                (s_id, 'Procurement Officer'),
                (s_id, 'Project Manager')
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- --- Project & Management ---
    SELECT id INTO cat_id FROM skill_categories WHERE name = 'Project & Management';
    IF cat_id IS NOT NULL THEN
        FOREACH skill_name IN ARRAY ARRAY['Project Planning', 'Team Coordination', 'Risk Management', 'Client Management', 'Decision Making']
        LOOP
            INSERT INTO skill_library (name, category_id) VALUES (skill_name, cat_id)
            ON CONFLICT (name, category_id) DO UPDATE SET updated_at = now()
            RETURNING id INTO s_id;
            
             IF s_id IS NULL THEN
                 SELECT id INTO s_id FROM skill_library WHERE name = skill_name AND category_id = cat_id;
            END IF;

            INSERT INTO skill_related_positions (skill_id, position_name) VALUES
                (s_id, 'Project Manager'),
                (s_id, 'Supervisor'),
                (s_id, 'Lead Roles')
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

     -- --- Research & Analysis ---
    SELECT id INTO cat_id FROM skill_categories WHERE name = 'Research & Analysis';
    IF cat_id IS NOT NULL THEN
        FOREACH skill_name IN ARRAY ARRAY['Design Research', 'Feasibility Study', 'Site Analysis', 'Market Research', 'Data Analysis']
        LOOP
            INSERT INTO skill_library (name, category_id) VALUES (skill_name, cat_id)
            ON CONFLICT (name, category_id) DO UPDATE SET updated_at = now()
            RETURNING id INTO s_id;
            
             IF s_id IS NULL THEN
                 SELECT id INTO s_id FROM skill_library WHERE name = skill_name AND category_id = cat_id;
            END IF;

            INSERT INTO skill_related_departments (skill_id, department_name) VALUES
                (s_id, 'Research and Business Development'),
                (s_id, 'Urban Design and Landscape')
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- --- Communication & Media ---
    SELECT id INTO cat_id FROM skill_categories WHERE name = 'Communication & Media';
    IF cat_id IS NOT NULL THEN
        FOREACH skill_name IN ARRAY ARRAY['Graphic Design', 'Branding', 'Social Media Management', 'Presentation Design', 'Copywriting']
        LOOP
            INSERT INTO skill_library (name, category_id) VALUES (skill_name, cat_id)
            ON CONFLICT (name, category_id) DO UPDATE SET updated_at = now()
            RETURNING id INTO s_id;
            
             IF s_id IS NULL THEN
                 SELECT id INTO s_id FROM skill_library WHERE name = skill_name AND category_id = cat_id;
            END IF;

            INSERT INTO skill_related_positions (skill_id, position_name) VALUES
                (s_id, 'Graphics Designer'),
                (s_id, 'Social Media Specialist'),
                (s_id, 'Business Development Officer')
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- --- Finance & Administration ---
    SELECT id INTO cat_id FROM skill_categories WHERE name = 'Finance & Administration';
    IF cat_id IS NOT NULL THEN
        FOREACH skill_name IN ARRAY ARRAY['Budgeting', 'Financial Reporting', 'Payroll Administration', 'Procurement Administration', 'Contract Management']
        LOOP
            INSERT INTO skill_library (name, category_id) VALUES (skill_name, cat_id)
            ON CONFLICT (name, category_id) DO UPDATE SET updated_at = now()
            RETURNING id INTO s_id;
            
             IF s_id IS NULL THEN
                 SELECT id INTO s_id FROM skill_library WHERE name = skill_name AND category_id = cat_id;
            END IF;

            INSERT INTO skill_related_departments (skill_id, department_name) VALUES
                (s_id, 'Human Capital, Finance, and Resources'),
                (s_id, 'Procurement and Construction')
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- --- Digital & IT ---
    SELECT id INTO cat_id FROM skill_categories WHERE name = 'Digital & IT';
    IF cat_id IS NOT NULL THEN
        FOREACH skill_name IN ARRAY ARRAY['System Administration', 'Web Development', 'Database Management', 'Automation & Integration', 'IT Support']
        LOOP
            INSERT INTO skill_library (name, category_id) VALUES (skill_name, cat_id)
            ON CONFLICT (name, category_id) DO UPDATE SET updated_at = now()
            RETURNING id INTO s_id;
            
             IF s_id IS NULL THEN
                 SELECT id INTO s_id FROM skill_library WHERE name = skill_name AND category_id = cat_id;
            END IF;

            INSERT INTO skill_related_positions (skill_id, position_name) VALUES
                (s_id, 'IT Development Officer')
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

END $$;

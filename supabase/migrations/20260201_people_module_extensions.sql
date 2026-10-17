-- Migration: People Module Extensions
-- Date: 2026-02-01
-- Description: Adds tables for People Skills, Availability, Feedback, and Performance Snapshots.
--              Includes strict RLS policies for "ME" vs "ORGANIZATION" role separation.

-- 0. Ensure 'hr' role exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role_enum' AND e.enumlabel = 'hr') THEN
        ALTER TYPE user_role_enum ADD VALUE 'hr';
    END IF;
END
$$;

-- 1. People Skills
CREATE TABLE IF NOT EXISTS people_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    skill_name TEXT NOT NULL,
    skill_level TEXT CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, skill_name)
);

-- 2. People Availability
CREATE TABLE IF NOT EXISTS people_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    workload_status TEXT CHECK (workload_status IN ('available', 'normal', 'overloaded')),
    source TEXT CHECK (source IN ('clock', 'task', 'manual')),
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id) -- One active status per user
);

-- 3. People Feedback (Private)
CREATE TABLE IF NOT EXISTS people_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- Target User
    reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Author
    note TEXT NOT NULL,
    visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'management')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Personal Performance Snapshots (Monthly)
CREATE TABLE IF NOT EXISTS people_performance_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    period DATE NOT NULL, -- First day of the month (e.g. 2026-02-01)
    
    -- Metrics
    attendance_score NUMERIC(5,2) DEFAULT 0, -- 0-100
    task_completion_score NUMERIC(5,2) DEFAULT 0,
    overtime_hours NUMERIC(10,2) DEFAULT 0,
    computed_index NUMERIC(5,2) DEFAULT 0, -- Overall Performance Index
    
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, period)
);

-- 5. Team Performance Snapshots
CREATE TABLE IF NOT EXISTS team_performance_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department TEXT NOT NULL, -- Grouping by Department Name
    period DATE NOT NULL,
    
    avg_performance NUMERIC(5,2) DEFAULT 0,
    attendance_rate NUMERIC(5,2) DEFAULT 0,
    utilization_rate NUMERIC(5,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(department, period)
);

-- Indexes for Capability
CREATE INDEX IF NOT EXISTS idx_people_skills_user ON people_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_people_perf_user_period ON people_performance_snapshots(user_id, period);
CREATE INDEX IF NOT EXISTS idx_team_perf_dept_period ON team_performance_snapshots(department, period);

-- ENABLE RLS
ALTER TABLE people_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE people_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE people_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE people_performance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_performance_snapshots ENABLE ROW LEVEL SECURITY;

-- DEFINITIONS
-- "Managers": admin, supervisor, hr (if exists), superadmin

-- A. PEOPLE SKILLS
-- Staff: Read Own, Write Own
-- Managers: Read All, Write All
DO $$ BEGIN
  CREATE POLICY "manage_own_skills" ON people_skills
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- FIX: Cast role to text to avoid "unsafe use of new value" error for 'hr'
DO $$ BEGIN
  CREATE POLICY "managers_manage_skills" ON people_skills
      USING (
          EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'supervisor', 'superadmin', 'hr'))
      )
      WITH CHECK (
          EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'supervisor', 'superadmin', 'hr'))
      );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- B. PEOPLE AVAILABILITY
-- Staff: Read/Write Own
-- Managers: Read All
DO $$ BEGIN
  CREATE POLICY "manage_own_availability" ON people_availability
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "managers_view_availability" ON people_availability
      FOR SELECT USING (
          EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'supervisor', 'superadmin', 'hr'))
      );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- C. PEOPLE FEEDBACK (PRIVATE)
-- Staff: CANNOT SEE (unless shared?), basically Private notes are usually for managers
-- Managers: Read/Write
DO $$ BEGIN
  CREATE POLICY "managers_manage_feedback" ON people_feedback
      USING (
          EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'supervisor', 'superadmin', 'hr'))
      );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- D. PERFORMANCE SNAPSHOTS
-- Staff: Read Own ONLY
-- Managers: Read All
DO $$ BEGIN
  CREATE POLICY "view_own_performance" ON people_performance_snapshots
      FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "managers_view_all_performance" ON people_performance_snapshots
      FOR SELECT USING (
          EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'supervisor', 'superadmin', 'hr'))
      );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- E. TEAM SNAPSHOTS
-- Staff: NO ACCESS (as per "ORGANIZATION data must be inaccessible for staff")
-- Managers: Read All
DO $$ BEGIN
  CREATE POLICY "managers_view_team_stats" ON team_performance_snapshots
      FOR SELECT USING (
          EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'supervisor', 'superadmin', 'hr'))
      );
EXCEPTION WHEN duplicate_object THEN null; END $$;

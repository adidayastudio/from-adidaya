-- =============================================
-- UPDATE CREW ROLE ENUM
-- Changes from old values to new bilingual values
-- Run this AFTER 033_crew_members.sql if table already exists
-- =============================================

-- Drop the existing table and enum to recreate with new values
-- WARNING: This will delete all existing crew data!
-- Only use if no production data exists yet

-- Step 1: Drop dependent objects
DROP TABLE IF EXISTS crew_project_history CASCADE;
DROP TABLE IF EXISTS crew_members CASCADE;

-- Step 2: Drop old enum
DROP TYPE IF EXISTS crew_role_enum CASCADE;

-- Step 3: Create new enum with proper values
CREATE TYPE crew_role_enum AS ENUM (
  'FOREMAN',   -- Mandor
  'LEADER',    -- Kepala Tukang
  'SKILLED',   -- Tukang
  'HELPER',    -- Kenek
  'OPERATOR',  -- Operator
  'GENERAL'    -- Lain-lain / General Worker
);

-- Step 4: Recreate tables (copy from 033)
CREATE TABLE crew_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Personal Info
  name TEXT NOT NULL,
  nik TEXT,
  phone TEXT,
  email TEXT,
  avatar_url TEXT,
  
  -- Work Info
  role crew_role_enum NOT NULL DEFAULT 'HELPER',
  skill_tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  join_date DATE,
  notes TEXT,
  
  -- Rates (IDR)
  base_daily_rate NUMERIC(15,2) DEFAULT 0,
  ot_rate_1 NUMERIC(15,2) DEFAULT 0,
  ot_rate_2 NUMERIC(15,2) DEFAULT 0,
  ot_rate_3 NUMERIC(15,2) DEFAULT 0,
  
  -- Bank Info
  bank_name TEXT,
  bank_account TEXT,
  
  -- Current Assignment
  current_project_code TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE crew_project_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_member_id UUID REFERENCES crew_members(id) ON DELETE CASCADE NOT NULL,
  project_code TEXT NOT NULL,
  project_name TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed', 'terminated')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_crew_members_workspace ON crew_members(workspace_id);
CREATE INDEX idx_crew_members_status ON crew_members(status);
CREATE INDEX idx_crew_members_role ON crew_members(role);
CREATE INDEX idx_crew_project_history_crew ON crew_project_history(crew_member_id);

-- RLS
ALTER TABLE crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_project_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "crew_members_select" ON crew_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "crew_members_insert" ON crew_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "crew_members_update" ON crew_members FOR UPDATE TO authenticated USING (true);
CREATE POLICY "crew_members_delete" ON crew_members FOR DELETE TO authenticated USING (true);
CREATE POLICY "crew_project_history_all" ON crew_project_history FOR ALL TO authenticated USING (true);

-- Trigger
CREATE OR REPLACE FUNCTION update_crew_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER crew_members_updated_at
  BEFORE UPDATE ON crew_members
  FOR EACH ROW
  EXECUTE FUNCTION update_crew_members_updated_at();

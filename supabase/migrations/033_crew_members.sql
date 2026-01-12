-- =============================================
-- CREW MEMBERS TABLE
-- Field workers data (Mandor, Tukang, Kenek, Operator)
-- Separate from app users (profiles/user_roles)
-- =============================================

-- Crew Role Enum
-- Note: Using simple codes, labels will be in the UI
DO $$ BEGIN
  CREATE TYPE crew_role_enum AS ENUM ('FOREMAN', 'LEADER', 'SKILLED', 'HELPER', 'OPERATOR', 'GENERAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Main Crew Members Table
CREATE TABLE IF NOT EXISTS crew_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Personal Info
  name TEXT NOT NULL,
  nik TEXT,               -- National ID (KTP)
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
  ot_rate_1 NUMERIC(15,2) DEFAULT 0,  -- OT 1st hour
  ot_rate_2 NUMERIC(15,2) DEFAULT 0,  -- OT 2nd+ hour
  ot_rate_3 NUMERIC(15,2) DEFAULT 0,  -- OT special
  
  -- Bank Info
  bank_name TEXT,
  bank_account TEXT,
  
  -- Current Assignment (project code, not FK for flexibility)
  current_project_code TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crew Project History (tracks assignments over time)
CREATE TABLE IF NOT EXISTS crew_project_history (
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
CREATE INDEX IF NOT EXISTS idx_crew_members_workspace ON crew_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_crew_members_status ON crew_members(status);
CREATE INDEX IF NOT EXISTS idx_crew_members_role ON crew_members(role);
CREATE INDEX IF NOT EXISTS idx_crew_project_history_crew ON crew_project_history(crew_member_id);

-- RLS
ALTER TABLE crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_project_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for crew_members (permissive for development)
DO $$ BEGIN
  CREATE POLICY "crew_members_select" ON crew_members FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "crew_members_insert" ON crew_members FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "crew_members_update" ON crew_members FOR UPDATE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "crew_members_delete" ON crew_members FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- RLS Policies for crew_project_history
DO $$ BEGIN
  CREATE POLICY "crew_project_history_all" ON crew_project_history FOR ALL TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_crew_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS crew_members_updated_at ON crew_members;
CREATE TRIGGER crew_members_updated_at
  BEFORE UPDATE ON crew_members
  FOR EACH ROW
  EXECUTE FUNCTION update_crew_members_updated_at();

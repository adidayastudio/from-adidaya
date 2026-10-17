-- ============================================================
-- DCR (Daily Construction Report) — Master + Field Materials
-- Shared master table for all DCR daily sections,
-- plus dcr_materials for daily material/equipment/service logs
-- ============================================================

-- 1. DCR Master Report (per date per project)
CREATE TABLE IF NOT EXISTS dcr_daily_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL,
  project_code text NOT NULL,
  report_date date NOT NULL,
  notes text,
  next_plan text,
  prepared_by text,
  approved_by text,
  status text DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, project_code, report_date)
);

-- 2. DCR Daily Materials Log (50 00 00)
CREATE TABLE IF NOT EXISTS dcr_materials (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  dcr_id uuid REFERENCES dcr_daily_reports(id) ON DELETE CASCADE NOT NULL,
  resource_id uuid,
  category text DEFAULT 'MATERIAL' CHECK (category IN ('MATERIAL','EQUIPMENT','SERVICE')),
  name text NOT NULL,
  unit text DEFAULT 'unit',
  incoming numeric DEFAULT 0,
  used numeric DEFAULT 0,
  stock numeric DEFAULT 0,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_dcr_reports_lookup ON dcr_daily_reports(workspace_id, project_code, report_date);
CREATE INDEX IF NOT EXISTS idx_dcr_materials_dcr ON dcr_materials(dcr_id);

-- 4. Enable RLS
ALTER TABLE dcr_daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE dcr_materials ENABLE ROW LEVEL SECURITY;

-- 5. Open RLS policies (matching existing anon access pattern in this project)
CREATE POLICY "anon_select_dcr_reports" ON dcr_daily_reports FOR SELECT USING (true);
CREATE POLICY "anon_insert_dcr_reports" ON dcr_daily_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_dcr_reports" ON dcr_daily_reports FOR UPDATE USING (true);
CREATE POLICY "anon_delete_dcr_reports" ON dcr_daily_reports FOR DELETE USING (true);

CREATE POLICY "anon_select_dcr_materials" ON dcr_materials FOR SELECT USING (true);
CREATE POLICY "anon_insert_dcr_materials" ON dcr_materials FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_dcr_materials" ON dcr_materials FOR UPDATE USING (true);
CREATE POLICY "anon_delete_dcr_materials" ON dcr_materials FOR DELETE USING (true);

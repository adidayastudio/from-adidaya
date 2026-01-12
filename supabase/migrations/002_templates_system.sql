-- Migration: Template Management System
-- Tables for managing project types, stages, WBS, RAB, and schedule templates

-- 1. Project Types Templates
CREATE TABLE IF NOT EXISTS project_type_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    project_type_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'Building2',
    color TEXT DEFAULT 'bg-blue-500',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, project_type_id)
);

-- 2. Stage Templates
CREATE TABLE IF NOT EXISTS stage_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    project_type_id TEXT NOT NULL,
    stage_code TEXT NOT NULL,
    stage_name TEXT NOT NULL,
    stage_name_id TEXT,
    display_code TEXT NOT NULL,
    position INT NOT NULL,
    weight_default DECIMAL(5,2) DEFAULT 10.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, project_type_id, stage_code)
);

-- 3. WBS Templates
CREATE TABLE IF NOT EXISTS wbs_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    project_type_id TEXT NOT NULL,
    stage_code TEXT,
    wbs_structure JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. RAB Price Templates
CREATE TABLE IF NOT EXISTS rab_price_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    wbs_code TEXT NOT NULL,
    title TEXT NOT NULL,
    unit TEXT,
    unit_price DECIMAL(15,2),
    material_cost DECIMAL(15,2),
    labor_cost DECIMAL(15,2),
    equipment_cost DECIMAL(15,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Schedule Templates
CREATE TABLE IF NOT EXISTS schedule_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    project_type_id TEXT NOT NULL,
    stage_code TEXT NOT NULL,
    default_duration_days INT DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, project_type_id, stage_code)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_project_type_templates_workspace ON project_type_templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_stage_templates_workspace ON stage_templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_stage_templates_type ON stage_templates(project_type_id);
CREATE INDEX IF NOT EXISTS idx_wbs_templates_workspace ON wbs_templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_rab_templates_workspace ON rab_price_templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_workspace ON schedule_templates(workspace_id);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update timestamp triggers
CREATE TRIGGER update_project_type_templates_updated_at BEFORE UPDATE ON project_type_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stage_templates_updated_at BEFORE UPDATE ON stage_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wbs_templates_updated_at BEFORE UPDATE ON wbs_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rab_templates_updated_at BEFORE UPDATE ON rab_price_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schedule_templates_updated_at BEFORE UPDATE ON schedule_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed default project types for workspace 1 (adjust workspace_id as needed)
INSERT INTO project_type_templates (workspace_id, project_type_id, name, description, icon, color) VALUES
    ('00000000-0000-0000-0000-000000000001', 'design-build', 'Design-Build', 'Full scope: design through construction', 'Building2', 'bg-blue-500'),
    ('00000000-0000-0000-0000-000000000001', 'design-only', 'Design Only', 'Design phases only, no construction', 'PenTool', 'bg-purple-500'),
    ('00000000-0000-0000-0000-000000000001', 'build-only', 'Build Only', 'Construction only, design provided by client', 'Hammer', 'bg-orange-500')
ON CONFLICT (workspace_id, project_type_id) DO NOTHING;

-- Seed default stages for design-build
INSERT INTO stage_templates (workspace_id, project_type_id, stage_code, stage_name, stage_name_id, display_code, position, weight_default) VALUES
    ('00000000-0000-0000-0000-000000000001', 'design-build', 'KO', 'Kickoff', 'Kickoff', '01-KO', 1, 5.00),
    ('00000000-0000-0000-0000-000000000001', 'design-build', 'SD', 'Schematic Design', 'Desain Skematik', '02-SD', 2, 12.50),
    ('00000000-0000-0000-0000-000000000001', 'design-build', 'DD', 'Design Development', 'Pengembangan Desain', '03-DD', 3, 17.50),
    ('00000000-0000-0000-0000-000000000001', 'design-build', 'ED', 'Engineering Design', 'Desain Rekayasa', '04-ED', 4, 22.50),
    ('00000000-0000-0000-0000-000000000001', 'design-build', 'PC', 'Procurement', 'Pengadaan', '05-PC', 5, 12.50),
    ('00000000-0000-0000-0000-000000000001', 'design-build', 'CN', 'Construction', 'Konstruksi', '06-CN', 6, 25.00),
    ('00000000-0000-0000-0000-000000000001', 'design-build', 'HO', 'Handover', 'Serah Terima', '07-HO', 7, 5.00)
ON CONFLICT (workspace_id, project_type_id, stage_code) DO NOTHING;

-- Seed default stages for design-only
INSERT INTO stage_templates (workspace_id, project_type_id, stage_code, stage_name, stage_name_id, display_code, position, weight_default) VALUES
    ('00000000-0000-0000-0000-000000000001', 'design-only', 'KO', 'Kickoff', 'Kickoff', '01-KO', 1, 5.00),
    ('00000000-0000-0000-0000-000000000001', 'design-only', 'SD', 'Schematic Design', 'Desain Skematik', '02-SD', 2, 20.65),
    ('00000000-0000-0000-0000-000000000001', 'design-only', 'DD', 'Design Development', 'Pengembangan Desain', '03-DD', 3, 28.91),
    ('00000000-0000-0000-0000-000000000001', 'design-only', 'ED', 'Engineering Design', 'Desain Rekayasa', '04-ED', 4, 37.17),
    ('00000000-0000-0000-0000-000000000001', 'design-only', 'HO', 'Handover', 'Serah Terima', '05-HO', 5, 8.26)
ON CONFLICT (workspace_id, project_type_id, stage_code) DO NOTHING;

-- Seed default stages for build-only
INSERT INTO stage_templates (workspace_id, project_type_id, stage_code, stage_name, stage_name_id, display_code, position, weight_default) VALUES
    ('00000000-0000-0000-0000-000000000001', 'build-only', 'KO', 'Kickoff', 'Kickoff', '01-KO', 1, 5.00),
    ('00000000-0000-0000-0000-000000000001', 'build-only', 'PC', 'Procurement', 'Pengadaan', '02-PC', 2, 27.94),
    ('00000000-0000-0000-0000-000000000001', 'build-only', 'CN', 'Construction', 'Konstruksi', '03-CN', 3, 55.88),
    ('00000000-0000-0000-0000-000000000001', 'build-only', 'HO', 'Handover', 'Serah Terima', '04-HO', 4, 11.18)
ON CONFLICT (workspace_id, project_type_id, stage_code) DO NOTHING;

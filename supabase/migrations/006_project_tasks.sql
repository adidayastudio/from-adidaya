-- Migration 006: Project Tasks & Template Enhancements
-- Creates table for project-specific tasks and adds metadata to templates

-- 1. Enhance stage_task_templates with UI metadata
ALTER TABLE stage_task_templates
ADD COLUMN IF NOT EXISTS section_code TEXT, -- e.g., 'KO-01'
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium'; -- 'low', 'medium', 'high', 'urgent'

-- 2. Create project_tasks table
CREATE TABLE IF NOT EXISTS project_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    stage_code TEXT NOT NULL, -- 'KO', 'SD', etc.
    section_code TEXT, -- 'KO-01' (Optional, for grouping)
    code TEXT, -- '01-01' (Sortable display code)
    name TEXT NOT NULL,
    weight DECIMAL(5,2) DEFAULT 0,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'verified'
    
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_project_tasks_project_stage ON project_tasks(project_id, stage_code);

-- 4. Triggers
DROP TRIGGER IF EXISTS update_project_tasks_updated_at ON project_tasks;
CREATE TRIGGER update_project_tasks_updated_at BEFORE UPDATE ON project_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

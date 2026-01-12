-- Migration 028: Schedule System (SSOT based on WBS)
-- Revised: Supports Shared WBS (Workspace) -> Project Specific Schedule

-- 1. Cleanup
DROP TABLE IF EXISTS project_schedule_dependencies CASCADE;
DROP TABLE IF EXISTS project_schedule_items CASCADE;

-- 2. Schedule Items
CREATE TABLE project_schedule_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    wbs_id UUID NOT NULL REFERENCES work_breakdown_structure(id) ON DELETE CASCADE,
    
    -- Schedule Levels
    duration_ballpark NUMERIC,
    duration_estimates NUMERIC,
    duration_detail NUMERIC,
    
    start_date DATE,
    end_date DATE,
    manual_start_date DATE,
    manual_end_date DATE,
    
    progress_percentage NUMERIC(5,2) DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    weight_percentage NUMERIC(5,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraint: One schedule item per WBS per PROJECT
    CONSTRAINT uq_schedule_project_wbs UNIQUE (project_id, wbs_id)
);

CREATE INDEX idx_schedule_items_project ON project_schedule_items(project_id);
CREATE INDEX idx_schedule_items_wbs ON project_schedule_items(wbs_id);

-- 3. Dependencies
CREATE TABLE project_schedule_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    predecessor_wbs_id UUID NOT NULL REFERENCES work_breakdown_structure(id) ON DELETE CASCADE,
    successor_wbs_id UUID NOT NULL REFERENCES work_breakdown_structure(id) ON DELETE CASCADE,
    
    dependency_type TEXT NOT NULL DEFAULT 'FS',
    lag_days NUMERIC DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT uq_schedule_dependency UNIQUE (project_id, predecessor_wbs_id, successor_wbs_id)
);

CREATE INDEX idx_schedule_deps_project ON project_schedule_dependencies(project_id);

-- 4. Sync Function (Manual/On-Demand instead of Trigger on WBS)
-- Since WBS doesn't have project_id, we can't trigger on WBS insert easily to know WHICH project to add to.
-- We will rely on calling this function when a Project is created OR when viewing the schedule.
CREATE OR REPLACE FUNCTION sync_project_schedule(target_project_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Insert missing schedule items for this project based on Workspace WBS
    -- Assuming a Project belongs to a Workspace, verify workspace link? 
    -- Projects table usually has workspace_id.
    
    INSERT INTO project_schedule_items (project_id, wbs_id)
    SELECT target_project_id, w.id
    FROM work_breakdown_structure w
    JOIN projects p ON p.id = target_project_id AND p.workspace_id = w.workspace_id
    ON CONFLICT (project_id, wbs_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- 5. RLS
ALTER TABLE project_schedule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_schedule_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON project_schedule_items
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for authenticated users" ON project_schedule_dependencies
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Realtime
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'project_schedule_items') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE project_schedule_items;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'project_schedule_dependencies') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE project_schedule_dependencies;
    END IF;
END $$;

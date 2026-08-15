-- 20260816_fix_stage_templates_rls.sql
-- Fix Row-Level Security policies for stage_section_templates, stage_task_templates, and stage_templates
-- To allow full read/insert/update/delete operations for both authenticated and anon roles during template configuration.

-- 1. Fix stage_section_templates
ALTER TABLE IF EXISTS stage_section_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON stage_section_templates;
DROP POLICY IF EXISTS "stage_section_templates_allow_all" ON stage_section_templates;

CREATE POLICY "stage_section_templates_allow_all"
    ON stage_section_templates
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 2. Fix stage_task_templates
ALTER TABLE IF EXISTS stage_task_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON stage_task_templates;
DROP POLICY IF EXISTS "stage_task_templates_allow_all" ON stage_task_templates;

CREATE POLICY "stage_task_templates_allow_all"
    ON stage_task_templates
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 3. Fix stage_templates
ALTER TABLE IF EXISTS stage_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON stage_templates;
DROP POLICY IF EXISTS "stage_templates_allow_all" ON stage_templates;

CREATE POLICY "stage_templates_allow_all"
    ON stage_templates
    FOR ALL
    USING (true)
    WITH CHECK (true);

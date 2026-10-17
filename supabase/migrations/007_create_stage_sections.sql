-- 007_create_stage_sections.sql
-- Create Stage Sections table and upgrade Tasks for hierarchy

-- 1. Create Stage Sections Table (Templates)
CREATE TABLE stage_section_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_id UUID NOT NULL REFERENCES stage_templates(id) ON DELETE CASCADE,
    section_code TEXT NOT NULL, -- "01", "02" etc.
    section_name TEXT NOT NULL, -- "General Information", etc.
    weight_default NUMERIC(10, 2) DEFAULT 0,
    sequence_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique section code per stage
    CONSTRAINT stage_sections_stage_code_uniq UNIQUE (stage_id, section_code)
);

-- 2. Update Stage Task Templates for Hierarchy & Sections
ALTER TABLE stage_task_templates
    ADD COLUMN parent_id UUID REFERENCES stage_task_templates(id) ON DELETE CASCADE, -- For Subtasks
    ADD COLUMN section_id UUID REFERENCES stage_section_templates(id) ON DELETE SET NULL; -- Link to Section

-- 3. Trigger for Updated At
CREATE TRIGGER update_stage_section_templates_modtime
    BEFORE UPDATE ON stage_section_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Enable RLS
ALTER TABLE stage_section_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON stage_section_templates
    FOR ALL
    USING (auth.uid() IS NOT NULL);

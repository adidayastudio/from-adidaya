-- Migration 005: Stages Module Enhancements
-- Adds new columns to stage_templates and creates stage_weights and stage_task_templates

-- 0. Ensure Trigger Function Exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 1. Enhance stage_templates
ALTER TABLE stage_templates
ADD COLUMN IF NOT EXISTS category TEXT, -- 'Design', 'Tender', 'Construction'
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS rules JSONB DEFAULT '{}', -- { editable_after_complete: boolean, auto_lock: boolean, ... }
ADD COLUMN IF NOT EXISTS lockable BOOLEAN DEFAULT true;

-- 2. Stage Weights (for Progress/Fee calculation per discipline)
CREATE TABLE IF NOT EXISTS stage_weights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_id UUID REFERENCES stage_templates(id) ON DELETE CASCADE,
    discipline_code TEXT NOT NULL, -- 'ARS', 'STR', 'MEP', 'ALL'
    weight_percentage DECIMAL(5,2) NOT NULL,
    basis TEXT DEFAULT 'Progress', -- 'Progress' or 'Fee'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(stage_id, discipline_code, basis)
);

-- 3. Stage Task Templates (Default tasks)
CREATE TABLE IF NOT EXISTS stage_task_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_id UUID REFERENCES stage_templates(id) ON DELETE CASCADE,
    task_name TEXT NOT NULL,
    discipline_code TEXT DEFAULT 'ALL',
    weight_default DECIMAL(5,2) DEFAULT 0,
    sequence_order INT DEFAULT 0,
    is_mandatory BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Triggers for updated_at
-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_stage_weights_updated_at ON stage_weights;
CREATE TRIGGER update_stage_weights_updated_at BEFORE UPDATE ON stage_weights FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stage_task_templates_updated_at ON stage_task_templates;
CREATE TRIGGER update_stage_task_templates_updated_at BEFORE UPDATE ON stage_task_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stage_weights_stage ON stage_weights(stage_id);
CREATE INDEX IF NOT EXISTS idx_stage_tasks_stage ON stage_task_templates(stage_id);

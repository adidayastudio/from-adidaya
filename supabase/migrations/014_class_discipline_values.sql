-- Create a new table to store dynamic values for Class x Discipline intersection
CREATE TABLE IF NOT EXISTS class_discipline_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    discipline_code TEXT NOT NULL, -- Links to disciplines.code
    cost_per_m2 NUMERIC DEFAULT 0,
    percentage NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(class_id, discipline_code)
);

-- Index for fast lookup
CREATE INDEX idx_class_discipline_lookup ON class_discipline_values(class_id, discipline_code);

-- Migrate existing data (for the standard SAMIL disciplines)
INSERT INTO class_discipline_values (workspace_id, class_id, discipline_code, cost_per_m2, percentage)
SELECT 
    workspace_id, 
    id as class_id, 
    'S' as discipline_code, 
    COALESCE(cost_multiplier_s, 0) as cost_per_m2, 
    COALESCE(percentage_s, 0) as percentage
FROM classes;

INSERT INTO class_discipline_values (workspace_id, class_id, discipline_code, cost_per_m2, percentage)
SELECT 
    workspace_id, 
    id as class_id, 
    'A' as discipline_code, 
    COALESCE(cost_multiplier_a, 0) as cost_per_m2, 
    COALESCE(percentage_a, 0) as percentage
FROM classes;

INSERT INTO class_discipline_values (workspace_id, class_id, discipline_code, cost_per_m2, percentage)
SELECT 
    workspace_id, 
    id as class_id, 
    'M' as discipline_code, 
    COALESCE(cost_multiplier_m, 0) as cost_per_m2, 
    COALESCE(percentage_m, 0) as percentage
FROM classes;

INSERT INTO class_discipline_values (workspace_id, class_id, discipline_code, cost_per_m2, percentage)
SELECT 
    workspace_id, 
    id as class_id, 
    'I' as discipline_code, 
    COALESCE(cost_multiplier_i, 0) as cost_per_m2, 
    COALESCE(percentage_i, 0) as percentage
FROM classes;

INSERT INTO class_discipline_values (workspace_id, class_id, discipline_code, cost_per_m2, percentage)
SELECT 
    workspace_id, 
    id as class_id, 
    'L' as discipline_code, 
    COALESCE(cost_multiplier_l, 0) as cost_per_m2, 
    COALESCE(percentage_l, 0) as percentage
FROM classes;

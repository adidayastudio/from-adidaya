-- Migration: Cost System & Price Library Separation
-- Separate Rules (Cost System) from Data (Price Library)

-- ====================================================
-- COST SYSTEM (RULES ENGINE)
-- ====================================================

-- 1. Cost Templates
-- Defines the configuration "container" for a project type or typology
CREATE TABLE IF NOT EXISTS cost_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    
    -- Template Type & Scope
    type TEXT NOT NULL CHECK (type IN ('general', 'typology')),
    typology_id TEXT, -- NULL if type is 'general', otherwise references a typology ID
    
    -- General Settings
    currency TEXT DEFAULT 'IDR',
    unit_basis TEXT DEFAULT 'm2' CHECK (unit_basis IN ('m2', 'm3', 'ls')),
    default_reset_behavior TEXT DEFAULT 'stage' CHECK (default_reset_behavior IN ('project', 'stage')),
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraint: Only one General template per workspace usually, but let's just index for now
    UNIQUE(workspace_id, name)
);

-- 2. Cost Template Rules
-- Stores the specific configuration for each tab: Stage-WBS, Components, Factors, Validation
CREATE TABLE IF NOT EXISTS cost_template_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cost_template_id UUID REFERENCES cost_templates(id) ON DELETE CASCADE,
    
    -- Rule Category corresponding to tabs
    rule_type TEXT NOT NULL CHECK (rule_type IN ('stage_wbs', 'components', 'factors', 'validation')),
    
    -- Stores JSON configuration. 
    -- For 'stage_wbs': { "max_depth": {"ballpark": 2, ...}, "mappings": {...} }
    -- For 'components': { "ballpark": [], "estimates": ["material", "labor"], ... }
    -- For 'factors': [ { "name": "Regional", "scope": "global", ... } ]
    -- For 'validation': { "ballpark_total_required": true, ... }
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(cost_template_id, rule_type)
);


-- ====================================================
-- PRICE LIBRARY (DATA ONLY)
-- ====================================================

-- 3. Price Library: Ballpark (Level 1 / m2)
CREATE TABLE IF NOT EXISTS price_library_ballpark (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    
    wbs_code TEXT NOT NULL, -- FK to WBS Level 1 in theory, but storing code for flexibility
    description TEXT,
    
    cost_per_m2 DECIMAL(15,2),
    percentage_allocation DECIMAL(5,2), -- 0-100%
    
    region_id TEXT DEFAULT 'default', -- For future regional pricing support
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Price Library: Estimates (Semi-detailed)
CREATE TABLE IF NOT EXISTS price_library_estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    
    item_code TEXT NOT NULL,
    description TEXT NOT NULL,
    unit TEXT NOT NULL,
    
    unit_price DECIMAL(15,2),
    
    -- Optional range for estimates
    unit_price_low DECIMAL(15,2),
    unit_price_high DECIMAL(15,2),
    
    tags TEXT[], -- To categorize e.g. "Concrete", "Steel"
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Price Library: Detail (AHSP / BOQ)
CREATE TABLE IF NOT EXISTS price_library_detail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    
    item_code TEXT NOT NULL,
    description TEXT NOT NULL,
    unit TEXT NOT NULL,
    
    -- Component Breakdown
    material_cost DECIMAL(15,2) DEFAULT 0,
    labor_cost DECIMAL(15,2) DEFAULT 0,
    equipment_cost DECIMAL(15,2) DEFAULT 0,
    overhead_cost DECIMAL(15,2) DEFAULT 0,
    profit_cost DECIMAL(15,2) DEFAULT 0,
    tax_cost DECIMAL(15,2) DEFAULT 0,
    
    -- Computed total (can be stored or generated, storing for performance/integrity)
    total_price DECIMAL(15,2) GENERATED ALWAYS AS (
        COALESCE(material_cost, 0) + 
        COALESCE(labor_cost, 0) + 
        COALESCE(equipment_cost, 0) + 
        COALESCE(overhead_cost, 0) + 
        COALESCE(profit_cost, 0) + 
        COALESCE(tax_cost, 0)
    ) STORED,
    
    source_ref TEXT, -- Reference to SNI or other standard
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);


-- Indexes
CREATE INDEX IF NOT EXISTS idx_cost_templates_workspace ON cost_templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_cost_rules_template ON cost_template_rules(cost_template_id);
CREATE INDEX IF NOT EXISTS idx_price_ballpark_workspace ON price_library_ballpark(workspace_id);
CREATE INDEX IF NOT EXISTS idx_price_estimates_workspace ON price_library_estimates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_price_detail_workspace ON price_library_detail(workspace_id);

-- Triggers for updated_at
CREATE TRIGGER update_cost_templates_updated_at BEFORE UPDATE ON cost_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cost_template_rules_updated_at BEFORE UPDATE ON cost_template_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_price_ballpark_updated_at BEFORE UPDATE ON price_library_ballpark FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_price_estimates_updated_at BEFORE UPDATE ON price_library_estimates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_price_detail_updated_at BEFORE UPDATE ON price_library_detail FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

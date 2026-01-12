-- Migration 003: Seed All Template Data
-- This migration populates all template tables with existing hardcoded data

-- ====================
-- DISCIPLINES (WBS_DISCIPLINES: S, A, M, I, L)
-- ====================
CREATE TABLE IF NOT EXISTS disciplines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name_en TEXT NOT NULL,
    name_id TEXT,
    color TEXT DEFAULT 'bg-neutral-500',
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, code)
);

INSERT INTO disciplines (workspace_id, code, name_en, name_id, sort_order) VALUES
    ('00000000-0000-0000-0000-000000000001', 'S', 'Structure', 'Struktur', 1),
    ('00000000-0000-0000-0000-000000000001', 'A', 'Architecture', 'Arsitektur', 2),
    ('00000000-0000-0000-0000-000000000001', 'M', 'MEP', 'MEP', 3),
    ('00000000-0000-0000-0000-000000000001', 'I', 'Interior', 'Interior', 4),
    ('00000000-0000-0000-0000-000000000001', 'L', 'Landscape', 'Lansekap', 5)
ON CONFLICT (workspace_id, code) DO NOTHING;

-- ====================
-- CLASSES (A, B, C, D with cost multipliers)
-- ====================
CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    class_code TEXT NOT NULL,
    description TEXT,
    cost_multiplier_s DECIMAL(12,2),
    cost_multiplier_a DECIMAL(12,2),
    cost_multiplier_m DECIMAL(12,2),
    cost_multiplier_i DECIMAL(12,2),
    cost_multiplier_l DECIMAL(12,2),
    finish_level TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, class_code)
);

-- Seed from RAB_BALLPARK_PRICES
INSERT INTO classes (workspace_id, class_code, description, cost_multiplier_s, cost_multiplier_a, cost_multiplier_m, cost_multiplier_i, cost_multiplier_l, finish_level, sort_order) VALUES
    ('00000000-0000-0000-0000-000000000001', 'A', 'Premium Finish', 3625000, 6525000, 4350000, 4350000, 2175000, 'Premium', 1),
    ('00000000-0000-0000-0000-000000000001', 'B', 'Standard Finish', 3150000, 4725000, 2625000, 2835000, 1365000, 'Standard', 2),
    ('00000000-0000-0000-0000-000000000001', 'C', 'Economic Finish', 2625000, 3000000, 1875000, 1725000, 750000, 'Economic', 3),
    ('00000000-0000-0000-0000-000000000001', 'D', 'Basic Finish', 1968750, 2250000, 1406250, 1293750, 562500, 'Basic', 4)
ON CONFLICT (workspace_id, class_code) DO NOTHING;

-- ====================
-- Update WBS_TEMPLATES table to store hierarchical structure
-- ====================
-- Already created in 002_templates_system.sql, now seed ballpark data

INSERT INTO wbs_templates (workspace_id, project_type_id, stage_code, wbs_structure) VALUES
('00000000-0000-0000-0000-000000000001', 'design-build', NULL, 
'[
  {"code":"S","nameEn":"Structure","nameId":"Struktur","children":[
    {"code":"S.1","nameEn":"Preparation","nameId":"Persiapan"},
    {"code":"S.2","nameEn":"Earthworks","nameId":"Tanah"},
    {"code":"S.3","nameEn":"Foundations","nameId":"Fondasi"},
    {"code":"S.4","nameEn":"Main Structure","nameId":"Struktur Utama"},
    {"code":"S.5","nameEn":"Roof Structure","nameId":"Struktur Atap"}
  ]},
  {"code":"A","nameEn":"Architecture","nameId":"Arsitektur","children":[
    {"code":"A.1","nameEn":"Wall Construction","nameId":"Pasangan Dinding"},
    {"code":"A.2","nameEn":"Wall Finishes","nameId":"Penutup Dinding"},
    {"code":"A.3","nameEn":"Floor Finishes","nameId":"Penutup Lantai"},
    {"code":"A.4","nameEn":"Ceiling","nameId":"Plafond"},
    {"code":"A.5","nameEn":"Roof Covering","nameId":"Penutup Atap"},
    {"code":"A.6","nameEn":"Painting","nameId":"Pengecatan"},
    {"code":"A.7","nameEn":"Door, Window, & Glazing","nameId":"Kaca, Pintu, Jendela"},
    {"code":"A.8","nameEn":"Façade","nameId":"Fasad"},
    {"code":"A.9","nameEn":"Sanitary","nameId":"Sanitair"},
    {"code":"A.10","nameEn":"Misc","nameId":"Lain-Lain"}
  ]},
  {"code":"M","nameEn":"MEP","nameId":"MEP","children":[
    {"code":"M.1","nameEn":"Plumbing","nameId":"Pemipaan"},
    {"code":"M.2","nameEn":"Electrical","nameId":"Elektrikal"},
    {"code":"M.3","nameEn":"Electronics & Low Current","nameId":"Elektronika"},
    {"code":"M.4","nameEn":"HVAC","nameId":"HVAC"},
    {"code":"M.5","nameEn":"Fire Protection","nameId":"Proteksi Kebakaran"},
    {"code":"M.6","nameEn":"Lightning Protection","nameId":"Proteksi Petir"}
  ]},
  {"code":"I","nameEn":"Interior","nameId":"Interior","children":[
    {"code":"I.1","nameEn":"Special Interior","nameId":"Interior Khusus"},
    {"code":"I.2","nameEn":"Special Materials","nameId":"Material Khusus"},
    {"code":"I.3","nameEn":"Special Lighting","nameId":"Pencahayaan Khusus"}
  ]},
  {"code":"L","nameEn":"Landscape","nameId":"Lansekap","children":[
    {"code":"L.1","nameEn":"Hardscape","nameId":"Pekerasan"},
    {"code":"L.2","nameEn":"Softscape","nameId":"Tanaman"},
    {"code":"L.3","nameEn":"Special Elements","nameId":"Elemen Khusus"}
  ]}
]'::jsonb)
ON CONFLICT DO NOTHING;

-- ====================
-- CATEGORIES
-- ====================
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    linked_project_types TEXT[],
    typical_area_min DECIMAL(12,2),
    typical_area_max DECIMAL(12,2),
    complexity_level TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, name)
);

INSERT INTO categories (workspace_id, name, linked_project_types, typical_area_min, typical_area_max, complexity_level) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Residential', ARRAY['design-build', 'design-only'], 100, 1000, 'Medium'),
    ('00000000-0000-0000-0000-000000000001', 'Commercial', ARRAY['design-build', 'build-only'], 500, 5000, 'High'),
    ('00000000-0000-0000-0000-000000000001', 'Infrastructure', ARRAY['design-build', 'build-only'], 1000, 50000, 'Very High')
ON CONFLICT (workspace_id, name) DO NOTHING;

-- ====================
-- LOCATION FACTORS (RF & DF)
-- ====================
CREATE TABLE IF NOT EXISTS location_factors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    province TEXT NOT NULL,
    city TEXT,
    regional_factor DECIMAL(5,2) DEFAULT 1.00,
    difficulty_factor DECIMAL(5,2) DEFAULT 1.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, province, city)
);

INSERT INTO location_factors (workspace_id, province, city, regional_factor, difficulty_factor) VALUES
    ('00000000-0000-0000-0000-000000000001', 'DKI Jakarta', 'Jakarta Pusat', 1.00, 1.00),
    ('00000000-0000-0000-0000-000000000001', 'DKI Jakarta', 'Jakarta Selatan', 1.00, 1.00),
    ('00000000-0000-0000-0000-000000000001', 'Jawa Barat', 'Bandung', 0.95, 1.05),
    ('00000000-0000-0000-0000-000000000001', 'Jawa Timur', 'Surabaya', 0.92, 1.08),
    ('00000000-0000-0000-0000-000000000001', 'Bali', 'Denpasar', 1.10, 1.15)
ON CONFLICT (workspace_id, province, city) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_disciplines_workspace ON disciplines(workspace_id);
CREATE INDEX IF NOT EXISTS idx_classes_workspace ON classes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_categories_workspace ON categories(workspace_id);
CREATE INDEX IF NOT EXISTS idx_location_factors_workspace ON location_factors(workspace_id);

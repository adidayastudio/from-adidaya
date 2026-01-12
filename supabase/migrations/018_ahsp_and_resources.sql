-- Migration 018: Add AHSP and Resources architecture

-- 1. Resources (The Ingredients)
-- Categories: 'material', 'labor', 'equipment'
CREATE TABLE IF NOT EXISTS pricing_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('material', 'labor', 'equipment')),
    unit TEXT, -- e.g. "m3", "kg", "orang/hari"
    price_default DECIMAL(15,2) DEFAULT 0, -- Base price
    source TEXT, -- e.g. "HSPK 2024", "Vendor A"
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pricing_resources_workspace ON pricing_resources(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pricing_resources_category ON pricing_resources(category);


-- 2. AHSP Masters (The Recipes Header)
CREATE TABLE IF NOT EXISTS ahsp_masters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    code TEXT, -- e.g. "A.2.2.1", "P.01"
    name TEXT NOT NULL, -- e.g. "Beton K-225"
    unit TEXT NOT NULL, -- The resulting unit, e.g. "m3"
    category TEXT, -- e.g. "Pekerjaan Persiapan", "Pekerjaan Beton"
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ahsp_masters_workspace ON ahsp_masters(workspace_id);


-- 3. AHSP Components (The Ingredients in a Recipe)
CREATE TABLE IF NOT EXISTS ahsp_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ahsp_id UUID REFERENCES ahsp_masters(id) ON DELETE CASCADE,
    resource_id UUID REFERENCES pricing_resources(id) ON DELETE RESTRICT, -- Prevent deleting resource used in analysis
    coefficient DECIMAL(10,5) NOT NULL DEFAULT 1.0, -- The quantity required per 1 unit of AHSP
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ahsp_components_ahsp ON ahsp_components(ahsp_id);


-- 4. Measurement Formulas (Placeholder for BOQ Logic)
-- Defines parameters required for specific work types (e.g. Stone Foundation)
CREATE TABLE IF NOT EXISTS measurement_formulas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g. "Pondasi Batu Kali (Trapesium)"
    parameters JSONB, -- e.g. ["sisi_atas", "sisi_bawah", "tinggi", "panjang"]
    formula_expression TEXT, -- e.g. "((sisi_atas + sisi_bawah) / 2) * tinggi * panjang"
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Triggers for Updated At
CREATE TRIGGER update_pricing_resources_updated_at BEFORE UPDATE ON pricing_resources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ahsp_masters_updated_at BEFORE UPDATE ON ahsp_masters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

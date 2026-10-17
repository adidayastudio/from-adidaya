-- Migration 090: Resource Revamp and Inventory Tracking

-- 1. Update pricing_resources category check
ALTER TABLE pricing_resources DROP CONSTRAINT IF EXISTS pricing_resources_category_check;
ALTER TABLE pricing_resources ADD CONSTRAINT pricing_resources_category_check 
    CHECK (category IN ('material', 'labor', 'equipment', 'service', 'asset', 'tool'));

-- 2. Resource Inventory Table
-- Tracks current stock/volume per project
CREATE TABLE IF NOT EXISTS resource_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID REFERENCES pricing_resources(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    quantity_in NUMERIC DEFAULT 0,
    quantity_used NUMERIC DEFAULT 0,
    quantity_manual_adj NUMERIC DEFAULT 0, -- For manual overrides
    last_sync_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Virtual column for available quantity (calculated)
-- available = in - used + adjustment

-- 3. Sync Tracking Table
-- Tracks which finance items have been synced to avoid duplicates
CREATE TABLE IF NOT EXISTS resource_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type TEXT NOT NULL CHECK (source_type IN ('PURCHASING', 'REIMBURSEMENT')),
    source_id UUID NOT NULL, -- The ID of the item in purchasing_items or reimbursement_items
    resource_id UUID REFERENCES pricing_resources(id),
    project_id UUID REFERENCES projects(id),
    sync_status TEXT DEFAULT 'COMPLETED',
    metadata JSONB DEFAULT '{}'::jsonb, -- Store original name, qty, etc.
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_resource_sync_log_source ON resource_sync_log(source_type, source_id);

-- 4. Triggers
CREATE TRIGGER update_resource_inventory_updated_at 
    BEFORE UPDATE ON resource_inventory 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. RLS
ALTER TABLE resource_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON resource_inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON resource_inventory FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for authenticated users" ON resource_inventory FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON resource_sync_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON resource_sync_log FOR INSERT TO authenticated WITH CHECK (true);

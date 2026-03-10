-- Migration 091: Add Resource Hierarchy Levels
-- Level 2: Subcategory (e.g., Struktur, Arsitektur, MEP)
-- Level 3: Group Name (e.g., Pasir, Beton, Besi, Kayu)

ALTER TABLE pricing_resources 
ADD COLUMN IF NOT EXISTS subcategory TEXT,
ADD COLUMN IF NOT EXISTS group_name TEXT;

-- Create indices for efficient filtering and grouping
CREATE INDEX IF NOT EXISTS idx_pricing_resources_subcategory ON pricing_resources(subcategory);
CREATE INDEX IF NOT EXISTS idx_pricing_resources_group ON pricing_resources(group_name);

-- Update existing data: try to infer subcategory from description or metadata if possible
-- For now, we will leave them null and let the AI re-sync or manual update fill them.

-- Migration 092: Add Resource Hierarchy to Finance Items

ALTER TABLE purchasing_items 
ADD COLUMN IF NOT EXISTS subcategory TEXT,
ADD COLUMN IF NOT EXISTS group_name TEXT;

ALTER TABLE reimbursement_items 
ADD COLUMN IF NOT EXISTS subcategory TEXT,
ADD COLUMN IF NOT EXISTS group_name TEXT;

CREATE INDEX IF NOT EXISTS idx_purchasing_items_subcategory ON purchasing_items(subcategory);
CREATE INDEX IF NOT EXISTS idx_purchasing_items_group ON purchasing_items(group_name);
CREATE INDEX IF NOT EXISTS idx_reimbursement_items_subcategory ON reimbursement_items(subcategory);
CREATE INDEX IF NOT EXISTS idx_reimbursement_items_group ON reimbursement_items(group_name);

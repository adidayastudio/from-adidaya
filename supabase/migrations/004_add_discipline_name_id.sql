-- Add name_id column to disciplines table for Indonesian translation
ALTER TABLE disciplines ADD COLUMN IF NOT EXISTS name_id TEXT;

-- Update existing records with temporary default if needed (optional, or just leave null)
-- UPDATE disciplines SET name_id = name_en WHERE name_id IS NULL;

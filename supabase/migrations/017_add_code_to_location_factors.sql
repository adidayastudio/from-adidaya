-- Migration 017: Add code column to location_factors
ALTER TABLE location_factors ADD COLUMN IF NOT EXISTS code TEXT;

-- Optional: Attempt to generate simple default codes (e.g. first 3 chars uppercase)
-- We won't do this destructively, just as a helper if null
UPDATE location_factors 
SET code = UPPER(SUBSTRING(COALESCE(city, province) FROM 1 FOR 3))
WHERE code IS NULL;

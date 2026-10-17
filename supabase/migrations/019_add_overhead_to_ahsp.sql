-- Add overhead_percent column to ahsp_masters
ALTER TABLE ahsp_masters
ADD COLUMN overhead_percent NUMERIC DEFAULT 10; -- Default to 10%

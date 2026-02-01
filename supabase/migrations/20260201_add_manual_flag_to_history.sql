-- Add is_manual column to career_history table
-- This allows us to distinguish between system-generated and manually added events

ALTER TABLE career_history 
ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT false;

-- Update existing records to be manual: true (assuming most existing for this user are manual)
-- or false if they come from system updates. 
-- For now, let's keep default as false.

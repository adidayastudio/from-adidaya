-- Add created_by to crew_requests to track who submitted the request
ALTER TABLE crew_requests ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Update existing records to set created_by to approved_by if available, or just leave null
UPDATE crew_requests SET created_by = approved_by WHERE created_by IS NULL AND approved_by IS NOT NULL;

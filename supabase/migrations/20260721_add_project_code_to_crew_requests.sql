-- Add project_code to crew_requests table if not present
ALTER TABLE crew_requests ADD COLUMN IF NOT EXISTS project_code text;

-- Update existing crew_requests rows to backfill project_code from crew_members.current_project_code where project_code is null
UPDATE crew_requests cr
SET project_code = cm.current_project_code
FROM crew_members cm
WHERE cr.crew_id = cm.id AND cr.project_code IS NULL AND cm.current_project_code IS NOT NULL;

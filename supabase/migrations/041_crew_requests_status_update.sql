
-- Update the check constraint for crew_requests status to include 'CANCELED'

ALTER TABLE crew_requests DROP CONSTRAINT IF EXISTS crew_requests_status_check;

ALTER TABLE crew_requests 
ADD CONSTRAINT crew_requests_status_check 
CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELED'));

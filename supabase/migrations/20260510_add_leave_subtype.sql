-- Add subtype column to leave_requests table
ALTER TABLE leave_requests
    ADD COLUMN IF NOT EXISTS subtype TEXT;

COMMENT ON COLUMN leave_requests.subtype IS 'Specific subtype for Leave/Permission requests (e.g., half_day, grief, etc.)';

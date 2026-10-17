-- Add location-related columns to attendance_records for timesheet display
ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS check_in_latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS check_in_longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS check_in_location_code TEXT,
ADD COLUMN IF NOT EXISTS check_in_location_type TEXT,
ADD COLUMN IF NOT EXISTS check_in_remote_mode TEXT,
ADD COLUMN IF NOT EXISTS check_in_location_status TEXT;

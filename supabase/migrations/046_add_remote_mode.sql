-- Add remote_mode column to attendance_logs
ALTER TABLE attendance_logs 
ADD COLUMN IF NOT EXISTS remote_mode TEXT; -- 'WFH' | 'WFA' | 'Business Trip'

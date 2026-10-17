-- ============================================
-- STEP 1: Add missing photo_url columns to DB
-- Run this in Supabase SQL Editor
-- ============================================

-- Add photo_url to attendance_sessions
ALTER TABLE attendance_sessions
    ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add photo_url to attendance_logs  
ALTER TABLE attendance_logs
    ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add check_in_photo_url and check_out_photo_url to attendance_records
ALTER TABLE attendance_records
    ADD COLUMN IF NOT EXISTS check_in_photo_url TEXT,
    ADD COLUMN IF NOT EXISTS check_out_photo_url TEXT;

-- ============================================
-- STEP 2: Backfill existing photos from storage
-- The photo files in 'attendance_photos' bucket are named:
--   {userId}-{IN|OUT}-{timestamp_ms}.jpg
-- We can try to match them to attendance_records by userId + date
-- ============================================

-- NOTE: Supabase Storage can be listed via the Supabase Dashboard > Storage > attendance_photos
-- For each file named like: abc123-IN-1741234567890.jpg
-- Extract userId = 'abc123', type = 'IN', timestamp_ms = 1741234567890
-- Convert timestamp_ms to date: to_timestamp(1741234567890 / 1000.0)
-- Then UPDATE attendance_records SET check_in_photo_url = '<public_url>' WHERE user_id = 'abc123' AND date = extracted_date

-- To get the public URL for a file, use:
-- https://<project_ref>.supabase.co/storage/v1/object/public/attendance_photos/<filename>

-- Example backfill query (run after listing files from storage API):
-- UPDATE attendance_records
-- SET check_in_photo_url = 'https://YOUR_PROJECT.supabase.co/storage/v1/object/public/attendance_photos/USER_ID-IN-TIMESTAMP.jpg'
-- WHERE user_id = 'USER_ID' AND date = 'YYYY-MM-DD';

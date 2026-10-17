-- Add photo_url column to attendance_sessions for tracking selfie photos per session
ALTER TABLE attendance_sessions
    ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Also add photo_url to attendance_logs if not already present
ALTER TABLE attendance_logs
    ADD COLUMN IF NOT EXISTS photo_url TEXT;

COMMENT ON COLUMN attendance_sessions.photo_url IS 'Supabase Storage public URL of the clock-in selfie photo for this session';
COMMENT ON COLUMN attendance_logs.photo_url IS 'Supabase Storage public URL of the selfie photo captured at this log event';

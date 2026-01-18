-- Add foreign key from attendance_logs.user_id to profiles.id
-- This allows PostgREST to join attendance_logs with profiles

ALTER TABLE attendance_logs
ADD CONSTRAINT attendance_logs_user_id_fkey_profiles
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- Comments for clarity
COMMENT ON CONSTRAINT attendance_logs_user_id_fkey_profiles ON attendance_logs IS 'Enables joining with profiles table via user_id';

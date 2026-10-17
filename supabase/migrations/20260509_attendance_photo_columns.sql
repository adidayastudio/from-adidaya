-- Add photo URL columns to attendance_records if not already present
ALTER TABLE attendance_records
    ADD COLUMN IF NOT EXISTS check_in_photo_url TEXT,
    ADD COLUMN IF NOT EXISTS check_out_photo_url TEXT;

-- Comment for clarity
COMMENT ON COLUMN attendance_records.check_in_photo_url IS 'Supabase Storage public URL of the check-in selfie photo';
COMMENT ON COLUMN attendance_records.check_out_photo_url IS 'Supabase Storage public URL of the check-out selfie photo';

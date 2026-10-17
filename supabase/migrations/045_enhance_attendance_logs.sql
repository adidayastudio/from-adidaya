-- 1. Enhance attendance_logs with GPS and location detection data
ALTER TABLE attendance_logs 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS accuracy DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS detected_location_id TEXT,
ADD COLUMN IF NOT EXISTS detected_location_code TEXT,
ADD COLUMN IF NOT EXISTS detected_location_type TEXT, -- 'office' | 'project'
ADD COLUMN IF NOT EXISTS distance_meters DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS location_status TEXT DEFAULT 'unknown', -- 'inside' | 'outside' | 'unknown'
ADD COLUMN IF NOT EXISTS override_reason TEXT;

-- 2. Fix RLS for attendance_logs (Insert check)
DROP POLICY IF EXISTS "Users can insert their own logs" ON attendance_logs;
CREATE POLICY "Users can insert their own logs"
    ON attendance_logs FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 3. Fix RLS for attendance_records (The root cause of the {} error)
-- Need to allow INSERT/UPDATE on attendance_records for the user to clock in/out
DROP POLICY IF EXISTS "Users can insert their own attendance records" ON attendance_records;
CREATE POLICY "Users can insert their own attendance records"
    ON attendance_records FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own attendance records" ON attendance_records;
CREATE POLICY "Users can update their own attendance records"
    ON attendance_records FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- 4. Set Managers permissions for all tables
-- Attendance Logs
DROP POLICY IF EXISTS "Managers can view all attendance logs" ON attendance_logs;
CREATE POLICY "Managers can view all attendance logs"
    ON attendance_logs FOR SELECT
    TO authenticated
    USING (is_manager());

-- Attendance Records
DROP POLICY IF EXISTS "Managers can view all attendance records" ON attendance_records;
CREATE POLICY "Managers can view all attendance records"
    ON attendance_records FOR SELECT
    TO authenticated
    USING (is_manager());

-- Enhance RLS for Clock module to support role detection from metadata
-- and fix foreign key relationships for easier joins

-- 1. Update Foreign Keys to point to profiles table for easier joining in public schema
-- Attendance Records
ALTER TABLE attendance_records 
    DROP CONSTRAINT IF EXISTS attendance_records_user_id_fkey,
    ADD CONSTRAINT attendance_records_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Leave Requests
ALTER TABLE leave_requests 
    DROP CONSTRAINT IF EXISTS leave_requests_user_id_fkey,
    ADD CONSTRAINT leave_requests_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Overtime Logs
ALTER TABLE overtime_logs 
    DROP CONSTRAINT IF EXISTS overtime_logs_user_id_fkey,
    ADD CONSTRAINT overtime_logs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 2. Create a helper function to check if user is a manager (from user_roles OR metadata)
CREATE OR REPLACE FUNCTION is_manager()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superadmin', 'supervisor', 'pm')
        )
        OR
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin', 'supervisor', 'pm', 'administrator', 'management')
        OR
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'superadmin', 'supervisor', 'pm', 'administrator', 'management')
        OR
        (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['admin', 'superadmin', 'supervisor', 'pm', 'administrator', 'management']
        OR
        (auth.jwt() -> 'user_metadata' -> 'roles') ?| array['admin', 'superadmin', 'supervisor', 'pm', 'administrator', 'management']
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Redefine RLS Policies using the helper function
-- LEAVE REQUESTS
DROP POLICY IF EXISTS "Managers can view all leave requests" ON leave_requests;
CREATE POLICY "Managers can view all leave requests"
    ON leave_requests FOR SELECT
    TO authenticated
    USING (is_manager());

DROP POLICY IF EXISTS "Managers can update leave requests" ON leave_requests;
CREATE POLICY "Managers can update leave requests"
    ON leave_requests FOR UPDATE
    TO authenticated
    USING (is_manager());

-- OVERTIME LOGS
DROP POLICY IF EXISTS "Managers can view all overtime logs" ON overtime_logs;
CREATE POLICY "Managers can view all overtime logs"
    ON overtime_logs FOR SELECT
    TO authenticated
    USING (is_manager());

DROP POLICY IF EXISTS "Managers can update overtime logs" ON overtime_logs;
CREATE POLICY "Managers can update overtime logs"
    ON overtime_logs FOR UPDATE
    TO authenticated
    USING (is_manager());

-- ATTENDANCE RECORDS
DROP POLICY IF EXISTS "Managers can view all attendance records" ON attendance_records;
CREATE POLICY "Managers can view all attendance records"
    ON attendance_records FOR SELECT
    TO authenticated
    USING (is_manager());

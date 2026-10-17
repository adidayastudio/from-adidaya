-- FIX: Missing RLS policies for attendance_records
-- Previous migrations might have missed INSERT/UPDATE for regular users

-- 1. Ensure RLS is enabled
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Users can insert their own attendance records
DROP POLICY IF EXISTS "Users can insert their own attendance records" ON attendance_records;
CREATE POLICY "Users can insert their own attendance records"
    ON attendance_records FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 3. Policy: Users can update their own attendance records
DROP POLICY IF EXISTS "Users can update their own attendance records" ON attendance_records;
CREATE POLICY "Users can update their own attendance records"
    ON attendance_records FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Policy: Users can view their own attendance records
DROP POLICY IF EXISTS "Users can view their own attendance records" ON attendance_records;
CREATE POLICY "Users can view their own attendance records"
    ON attendance_records FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- 5. Policy: Managers can view all attendance records
DROP POLICY IF EXISTS "Managers can view all attendance records" ON attendance_records;
CREATE POLICY "Managers can view all attendance records"
    ON attendance_records FOR SELECT
    TO authenticated
    USING (is_manager());

-- =============================================
-- CONSOLIDATED CLOCK MODULE MIGRATION
-- Tables + RLS + Performance Enhancements
-- =============================================

-- 1. Ensure Enums exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role_enum' AND e.enumlabel = 'superadmin') THEN
        ALTER TYPE user_role_enum ADD VALUE 'superadmin';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role_enum' AND e.enumlabel = 'pm') THEN
        ALTER TYPE user_role_enum ADD VALUE 'pm';
    END IF;
END
$$;

-- 2. Enhance profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS join_date DATE DEFAULT CURRENT_DATE;

-- 3. Create Tables
-- LEAVE REQUESTS
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL, 
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'pending', 
    reason TEXT,
    reject_reason TEXT,
    file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- OVERTIME LOGS
CREATE TABLE IF NOT EXISTS overtime_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    project_id TEXT, 
    status TEXT DEFAULT 'pending', 
    description TEXT,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ATTENDANCE RECORDS
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    clock_in TIMESTAMPTZ,
    clock_out TIMESTAMPTZ,
    status TEXT DEFAULT 'ontime', 
    total_minutes INTEGER DEFAULT 0,
    overtime_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, date)
);

-- 4. Helper Function for is_manager (Support Metadata & Tables)
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

-- 5. Enable RLS and Set Policies
-- LEAVE REQUESTS
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own leave requests" ON leave_requests;
CREATE POLICY "Users can view their own leave requests" ON leave_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own leave requests" ON leave_requests;
CREATE POLICY "Users can insert their own leave requests" ON leave_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Managers can view all leave requests" ON leave_requests;
CREATE POLICY "Managers can view all leave requests" ON leave_requests FOR SELECT TO authenticated USING (is_manager());
DROP POLICY IF EXISTS "Managers can update leave requests" ON leave_requests;
CREATE POLICY "Managers can update leave requests" ON leave_requests FOR UPDATE TO authenticated USING (is_manager());

-- OVERTIME LOGS
ALTER TABLE overtime_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own overtime logs" ON overtime_logs;
CREATE POLICY "Users can view their own overtime logs" ON overtime_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own overtime logs" ON overtime_logs;
CREATE POLICY "Users can insert their own overtime logs" ON overtime_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Managers can view all overtime logs" ON overtime_logs;
CREATE POLICY "Managers can view all overtime logs" ON overtime_logs FOR SELECT TO authenticated USING (is_manager());
DROP POLICY IF EXISTS "Managers can update overtime logs" ON overtime_logs;
CREATE POLICY "Managers can update overtime logs" ON overtime_logs FOR UPDATE TO authenticated USING (is_manager());

-- ATTENDANCE RECORDS
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own attendance records" ON attendance_records;
CREATE POLICY "Users can view their own attendance records" ON attendance_records FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Managers can view all attendance records" ON attendance_records;
CREATE POLICY "Managers can view all attendance records" ON attendance_records FOR SELECT TO authenticated USING (is_manager());

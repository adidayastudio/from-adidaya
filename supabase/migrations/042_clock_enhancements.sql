-- 1. Update user_role_enum to include superadmin and pm
-- Note: 'user_role_enum' was created in 029_create_user_roles.sql
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

-- 3. Create Leave Requests table
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL, -- 'Annual Leave', 'Sick Leave', etc.
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    reason TEXT,
    reject_reason TEXT,
    file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for Leave Requests
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own leave requests"
    ON leave_requests FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own leave requests"
    ON leave_requests FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers can view all leave requests"
    ON leave_requests FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superadmin', 'supervisor', 'pm')
        )
    );

CREATE POLICY "Managers can update leave requests"
    ON leave_requests FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superadmin', 'supervisor', 'pm')
        )
    );

-- 4. Create Overtime Logs table
CREATE TABLE IF NOT EXISTS overtime_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    project_id TEXT, -- ID from projects table if linked
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    description TEXT,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for Overtime Logs
ALTER TABLE overtime_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own overtime logs"
    ON overtime_logs FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own overtime logs"
    ON overtime_logs FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers can view all overtime logs"
    ON overtime_logs FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superadmin', 'supervisor', 'pm')
        )
    );

CREATE POLICY "Managers can update overtime logs"
    ON overtime_logs FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superadmin', 'supervisor', 'pm')
        )
    );

-- 5. Create Daily Attendance Records (Aggregated)
-- This facilitates the Timesheet view without complex aggregations of logs on every load.
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    clock_in TIMESTAMPTZ,
    clock_out TIMESTAMPTZ,
    status TEXT DEFAULT 'ontime', -- 'ontime', 'late', 'absent', etc.
    total_minutes INTEGER DEFAULT 0,
    overtime_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, date)
);

-- RLS for Attendance Records
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own attendance records"
    ON attendance_records FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Managers can view all attendance records"
    ON attendance_records FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superadmin', 'supervisor', 'pm')
        )
    );

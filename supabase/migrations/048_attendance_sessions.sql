-- Create attendance_sessions table for multi-session support
CREATE TABLE IF NOT EXISTS attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    session_number INTEGER NOT NULL DEFAULT 1,
    clock_in TIMESTAMPTZ NOT NULL,
    clock_out TIMESTAMPTZ,
    duration_minutes INTEGER DEFAULT 0,
    is_overtime BOOLEAN DEFAULT FALSE,
    -- Location metadata for this session
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location_code TEXT,
    location_type TEXT,
    remote_mode TEXT,
    location_status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date, session_number)
);

-- Enable RLS
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
DROP POLICY IF EXISTS "Users can view their own sessions" ON attendance_sessions;
CREATE POLICY "Users can view their own sessions"
    ON attendance_sessions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can insert their own sessions
DROP POLICY IF EXISTS "Users can insert their own sessions" ON attendance_sessions;
CREATE POLICY "Users can insert their own sessions"
    ON attendance_sessions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions
DROP POLICY IF EXISTS "Users can update their own sessions" ON attendance_sessions;
CREATE POLICY "Users can update their own sessions"
    ON attendance_sessions FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- Managers can view all sessions
DROP POLICY IF EXISTS "Managers can view all sessions" ON attendance_sessions;
CREATE POLICY "Managers can view all sessions"
    ON attendance_sessions FOR SELECT
    TO authenticated
    USING (is_manager());

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_user_date ON attendance_sessions(user_id, date);

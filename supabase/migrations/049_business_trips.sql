-- ============================================
-- Business Trips (Perjalanan Dinas) Table
-- ============================================
-- Pattern cloned from leave_requests and overtime_logs

CREATE TABLE IF NOT EXISTS business_trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    destination TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    purpose TEXT NOT NULL,
    project_id TEXT, -- Optional link to project
    transportation TEXT, -- Mode of transport
    accommodation TEXT, -- Accommodation details
    estimated_cost NUMERIC(15, 2), -- Budget estimate
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    reject_reason TEXT,
    file_url TEXT, -- Supporting documents
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add foreign key to profiles table (same as leave_requests, overtime_logs)
-- This enables PostgREST joins with profiles:user_id
ALTER TABLE business_trips
    DROP CONSTRAINT IF EXISTS business_trips_user_id_fkey,
    ADD CONSTRAINT business_trips_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- ============================================
-- RLS Policies (Same pattern as overtime_logs)
-- ============================================

ALTER TABLE business_trips ENABLE ROW LEVEL SECURITY;

-- Users can view their own business trips
DROP POLICY IF EXISTS "Users can view their own business trips" ON business_trips;
CREATE POLICY "Users can view their own business trips"
    ON business_trips FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can insert their own business trips
DROP POLICY IF EXISTS "Users can insert their own business trips" ON business_trips;
CREATE POLICY "Users can insert their own business trips"
    ON business_trips FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Managers can view all business trips
DROP POLICY IF EXISTS "Managers can view all business trips" ON business_trips;
CREATE POLICY "Managers can view all business trips"
    ON business_trips FOR SELECT
    TO authenticated
    USING (is_manager());

-- Managers can update business trips (for approvals)
DROP POLICY IF EXISTS "Managers can update business trips" ON business_trips;
CREATE POLICY "Managers can update business trips"
    ON business_trips FOR UPDATE
    TO authenticated
    USING (is_manager());

-- ============================================
-- Indexes for Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_business_trips_user_id ON business_trips(user_id);
CREATE INDEX IF NOT EXISTS idx_business_trips_status ON business_trips(status);
CREATE INDEX IF NOT EXISTS idx_business_trips_dates ON business_trips(start_date, end_date);

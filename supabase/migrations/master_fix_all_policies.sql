-- MASTER FIX: RLS Policies for Clock Module (Delete & Update)
-- This script resets and re-applies policies for Leave, Overtime, and Business Trips.
-- Run this ENTIRE script in Supabase SQL Editor to fix "Cancel" and "Delete" issues.

-- =========================================================================
-- 1. LEAVE REQUESTS (leave_requests)
-- =========================================================================

-- Enable permissions for Users to CANCEL (Update) their own requests
DROP POLICY IF EXISTS "Users can update their own leave requests" ON leave_requests;
CREATE POLICY "Users can update their own leave requests"
    ON leave_requests FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Enable permissions for Users to DELETE their own PENDING requests
DROP POLICY IF EXISTS "Users can delete their pending leave requests" ON leave_requests;
CREATE POLICY "Users can delete their pending leave requests"
    ON leave_requests FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id AND status = 'pending');

-- Enable permissions for MANAGERS to DELETE any request
DROP POLICY IF EXISTS "Managers can delete leave requests" ON leave_requests;
CREATE POLICY "Managers can delete leave requests"
    ON leave_requests FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superadmin', 'supervisor', 'pm')
        )
    );

-- =========================================================================
-- 2. OVERTIME LOGS (overtime_logs)
-- =========================================================================

-- Enable permissions for Users to CANCEL (Update) their own requests
DROP POLICY IF EXISTS "Users can update their own overtime logs" ON overtime_logs;
CREATE POLICY "Users can update their own overtime logs"
    ON overtime_logs FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Enable permissions for Users to DELETE their own PENDING requests
DROP POLICY IF EXISTS "Users can delete their pending overtime logs" ON overtime_logs;
CREATE POLICY "Users can delete their pending overtime logs"
    ON overtime_logs FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id AND status = 'pending');

-- Enable permissions for MANAGERS to DELETE any request
DROP POLICY IF EXISTS "Managers can delete overtime logs" ON overtime_logs;
CREATE POLICY "Managers can delete overtime logs"
    ON overtime_logs FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superadmin', 'supervisor', 'pm')
        )
    );

-- =========================================================================
-- 3. BUSINESS TRIPS (business_trips)
-- =========================================================================

-- Enable permissions for Users to CANCEL (Update) their own requests
DROP POLICY IF EXISTS "Users can update their own business trips" ON business_trips;
CREATE POLICY "Users can update their own business trips"
    ON business_trips FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Enable permissions for Users to DELETE their own PENDING requests
DROP POLICY IF EXISTS "Users can delete their pending business trips" ON business_trips;
CREATE POLICY "Users can delete their pending business trips"
    ON business_trips FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id AND status = 'pending');

-- Enable permissions for MANAGERS to DELETE any request
DROP POLICY IF EXISTS "Managers can delete business trips" ON business_trips;
CREATE POLICY "Managers can delete business trips"
    ON business_trips FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superadmin', 'supervisor', 'pm')
        )
    );

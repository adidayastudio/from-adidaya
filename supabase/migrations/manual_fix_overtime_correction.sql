-- FIX OVERTIME CORRECTION & APPROVALS
-- Run this script to ensure the Overtime Correction feature works

-- 1. Ensure columns exist (for storing corrected times)
ALTER TABLE overtime_logs ADD COLUMN IF NOT EXISTS approved_start_time TIME;
ALTER TABLE overtime_logs ADD COLUMN IF NOT EXISTS approved_end_time TIME;

-- 2. Ensure Managers can UPDATE overtime logs (Approve, Reject, Correct)
DROP POLICY IF EXISTS "Managers can update overtime logs" ON overtime_logs;
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

-- 3. Ensure Managers can UPDATE Leave and Business Trips too (for Approvals)
DROP POLICY IF EXISTS "Managers can update leave requests" ON leave_requests;
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

DROP POLICY IF EXISTS "Managers can update business trips" ON business_trips;
CREATE POLICY "Managers can update business trips"
    ON business_trips FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superadmin', 'supervisor', 'pm')
        )
    );

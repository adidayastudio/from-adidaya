-- Enable DELETE policies for Clock module tables
-- Run this in your Supabase SQL Editor if "delete" actions are failing

-- 1. Leave Requests
DROP POLICY IF EXISTS "Users can delete their pending leave requests" ON leave_requests;
CREATE POLICY "Users can delete their pending leave requests"
    ON leave_requests FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id AND status = 'pending');

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

-- 2. Overtime Logs
DROP POLICY IF EXISTS "Users can delete their pending overtime logs" ON overtime_logs;
CREATE POLICY "Users can delete their pending overtime logs"
    ON overtime_logs FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id AND status = 'pending');

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

-- 3. Business Trips
DROP POLICY IF EXISTS "Users can delete their pending business trips" ON business_trips;
CREATE POLICY "Users can delete their pending business trips"
    ON business_trips FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id AND status = 'pending');

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

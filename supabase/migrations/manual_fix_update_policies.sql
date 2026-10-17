-- Enable UPDATE policies for Clock module tables
-- This allows users to Cancel (update status) their own requests

-- 1. Leave Requests
DROP POLICY IF EXISTS "Users can update their own leave requests" ON leave_requests;
CREATE POLICY "Users can update their own leave requests"
    ON leave_requests FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 2. Overtime Logs
DROP POLICY IF EXISTS "Users can update their own overtime logs" ON overtime_logs;
CREATE POLICY "Users can update their own overtime logs"
    ON overtime_logs FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. Business Trips
DROP POLICY IF EXISTS "Users can update their own business trips" ON business_trips;
CREATE POLICY "Users can update their own business trips"
    ON business_trips FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

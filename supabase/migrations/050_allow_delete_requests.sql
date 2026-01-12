-- Allow users to delete their own leave requests
CREATE POLICY "Users can delete their own leave requests"
    ON leave_requests FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Allow users to delete their own overtime logs
CREATE POLICY "Users can delete their own overtime logs"
    ON overtime_logs FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Allow users to delete their own business trips
CREATE POLICY "Users can delete their own business trips"
    ON business_trips FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

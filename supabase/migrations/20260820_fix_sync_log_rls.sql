-- Fix RLS Policy for resource_sync_log to allow updates
CREATE POLICY "Enable update access for authenticated users" 
ON public.resource_sync_log 
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

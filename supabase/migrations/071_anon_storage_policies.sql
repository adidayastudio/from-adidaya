-- Add storage policies for anon role to allow file uploads
-- This is needed because the client-side Supabase client may use anon role

-- Policy: Anon users can upload finance files
CREATE POLICY "Anon users can upload finance files"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'finance_attachments');

-- Policy: Anon users can view finance files
CREATE POLICY "Anon users can view finance files"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'finance_attachments');

-- Policy: Anon users can update finance files
CREATE POLICY "Anon users can update finance files"
ON storage.objects FOR UPDATE
TO anon
USING (bucket_id = 'finance_attachments');

-- Policy: Anon users can delete finance files
CREATE POLICY "Anon users can delete finance files"
ON storage.objects FOR DELETE
TO anon
USING (bucket_id = 'finance_attachments');

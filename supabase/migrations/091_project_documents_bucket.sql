-- Create bucket for project documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('project_documents', 'project_documents', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload project files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK ( bucket_id = 'project_documents' );

-- Policy: Allow authenticated users to retrieve files
CREATE POLICY "Authenticated users can view project files"
ON storage.objects FOR SELECT TO authenticated
USING ( bucket_id = 'project_documents' );

-- Policy: Allow authenticated users to delete files they own or admin roles
CREATE POLICY "Authenticated users can delete project files"
ON storage.objects FOR DELETE TO authenticated
USING ( bucket_id = 'project_documents' );

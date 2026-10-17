-- Create bucket for crew documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('crew-documents', 'crew-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public access to files
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Public Access for Crew Documents'
    ) THEN
        CREATE POLICY "Public Access for Crew Documents"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'crew-documents');
    END IF;
END $$;

-- Policy to allow authenticated uploads
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Allow Authenticated Uploads for Crew Documents'
    ) THEN
        CREATE POLICY "Allow Authenticated Uploads for Crew Documents"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'crew-documents');
    END IF;
END $$;

-- Policy to allow authenticated deletes
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Allow Authenticated Deletes for Crew Documents'
    ) THEN
        CREATE POLICY "Allow Authenticated Deletes for Crew Documents"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (bucket_id = 'crew-documents');
    END IF;
END $$;

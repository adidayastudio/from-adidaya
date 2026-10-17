-- Migration to fix Storage RLS for knowledge-assets bucket
-- This ensures that privileged users can upload, update and delete files

-- 1. Ensure the bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-assets', 'knowledge-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Enable RLS on storage.objects (usually enabled by default in Supabase)

-- 3. Create policies for knowledge-assets bucket
-- DROP existing policies to avoid conflicts
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow public read for knowledge assets" ON storage.objects;
    DROP POLICY IF EXISTS "Allow privileged roles to upload knowledge assets" ON storage.objects;
    DROP POLICY IF EXISTS "Allow privileged roles to update knowledge assets" ON storage.objects;
    DROP POLICY IF EXISTS "Allow privileged roles to delete knowledge assets" ON storage.objects;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- Policy: Allow all authenticated users to read objects
CREATE POLICY "Allow public read for knowledge assets"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'knowledge-assets');

-- Policy: Allow only privileged roles to INSERT (Upload)
CREATE POLICY "Allow privileged roles to upload knowledge assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'knowledge-assets' AND
    (SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('superadmin', 'admin', 'administrator', 'supervisor', 'hr', 'pm', 'management', 'owner')
    ))
);

-- Policy: Allow only privileged roles to UPDATE
CREATE POLICY "Allow privileged roles to update knowledge assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'knowledge-assets' AND
    (SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('superadmin', 'admin', 'administrator', 'supervisor', 'hr', 'pm', 'management', 'owner')
    ))
);

-- Policy: Allow only privileged roles to DELETE
CREATE POLICY "Allow privileged roles to delete knowledge assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'knowledge-assets' AND
    (SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('superadmin', 'admin', 'administrator', 'supervisor', 'hr', 'pm', 'management', 'owner')
    ))
);

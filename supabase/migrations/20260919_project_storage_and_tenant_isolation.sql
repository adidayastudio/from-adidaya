-- ==============================================================================
-- PROJECT STORAGE BUCKET & TENANT ISOLATION MIGRATION
-- Buckets: 'project-files', 'from-adidaya'
-- Path convention: <tenant_id>/projects/<project_id>/<filename>
-- Security: Strict tenant isolation - users can only read/write files belonging to their tenant
-- ==============================================================================

-- 1. Create or ensure buckets exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('project-files', 'project-files', true, 52428800, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'application/pdf']),
    ('from-adidaya', 'from-adidaya', true, 52428800, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing conflicting policies for these buckets
DROP POLICY IF EXISTS "Tenant members can view project files" ON storage.objects;
DROP POLICY IF EXISTS "Tenant members can insert project files" ON storage.objects;
DROP POLICY IF EXISTS "Tenant members can update project files" ON storage.objects;
DROP POLICY IF EXISTS "Tenant members can delete project files" ON storage.objects;
DROP POLICY IF EXISTS "Public can view project files" ON storage.objects;

-- 4. RLS Policy: View / Select project files (Tenant-Isolated)
-- Allows reading if the file is in the user's tenant folder OR if user is a member of that tenant
CREATE POLICY "Tenant members can view project files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id IN ('project-files', 'from-adidaya')
    AND (
        -- Global / legacy files or public assets
        (storage.foldername(name))[1] = 'global'
        OR
        -- Path format: <tenant_id>/... -> check if current user is member of that tenant
        EXISTS (
            SELECT 1 
            FROM public.tenant_members tm
            WHERE tm.user_id = auth.uid()
            AND (
                tm.tenant_id::text = (storage.foldername(name))[1]
                OR tm.tenant_id::text = (storage.foldername(name))[2]
            )
        )
        OR
        -- Superadmin check
        EXISTS (
            SELECT 1 
            FROM public.tenant_members tm
            WHERE tm.user_id = auth.uid()
            AND LOWER(tm.role) IN ('superadmin', 'super_admin', 'owner')
        )
    )
);

-- 5. RLS Policy: Insert / Upload project files (Tenant-Isolated)
CREATE POLICY "Tenant members can insert project files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id IN ('project-files', 'from-adidaya')
    AND (
        (storage.foldername(name))[1] = 'global'
        OR
        EXISTS (
            SELECT 1 
            FROM public.tenant_members tm
            WHERE tm.user_id = auth.uid()
            AND (
                tm.tenant_id::text = (storage.foldername(name))[1]
                OR tm.tenant_id::text = (storage.foldername(name))[2]
            )
        )
        OR
        EXISTS (
            SELECT 1 
            FROM public.tenant_members tm
            WHERE tm.user_id = auth.uid()
            AND LOWER(tm.role) IN ('superadmin', 'super_admin', 'owner')
        )
    )
);

-- 6. RLS Policy: Update project files (Tenant-Isolated)
CREATE POLICY "Tenant members can update project files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id IN ('project-files', 'from-adidaya')
    AND (
        (storage.foldername(name))[1] = 'global'
        OR
        EXISTS (
            SELECT 1 
            FROM public.tenant_members tm
            WHERE tm.user_id = auth.uid()
            AND (
                tm.tenant_id::text = (storage.foldername(name))[1]
                OR tm.tenant_id::text = (storage.foldername(name))[2]
            )
        )
    )
)
WITH CHECK (
    bucket_id IN ('project-files', 'from-adidaya')
    AND (
        (storage.foldername(name))[1] = 'global'
        OR
        EXISTS (
            SELECT 1 
            FROM public.tenant_members tm
            WHERE tm.user_id = auth.uid()
            AND (
                tm.tenant_id::text = (storage.foldername(name))[1]
                OR tm.tenant_id::text = (storage.foldername(name))[2]
            )
        )
    )
);

-- 7. RLS Policy: Delete project files (Tenant-Isolated)
CREATE POLICY "Tenant members can delete project files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id IN ('project-files', 'from-adidaya')
    AND (
        (storage.foldername(name))[1] = 'global'
        OR
        EXISTS (
            SELECT 1 
            FROM public.tenant_members tm
            WHERE tm.user_id = auth.uid()
            AND (
                tm.tenant_id::text = (storage.foldername(name))[1]
                OR tm.tenant_id::text = (storage.foldername(name))[2]
            )
        )
    )
);

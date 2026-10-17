-- ==============================================================================
-- PROJECT ACTIVITIES MEDIA & ATTACHMENTS STORAGE MIGRATION
-- Buckets: 'project-activities', 'project-files'
-- Supports: Photos (jpg, png, webp, heic), Videos (mp4, mov, webm), Documents (pdf, docx, xlsx, zip, etc.)
-- Path convention: <tenant_id>/projects/<project_id>/activities/<filename>
-- ==============================================================================

-- 1. Create or ensure buckets exist with comprehensive media & document mime types
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    (
        'project-activities', 
        'project-activities', 
        true, 
        104857600, -- 100 MB for video & large attachments
        ARRAY[
            'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
            'video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/zip',
            'text/plain',
            'text/csv'
        ]
    ),
    (
        'project-files', 
        'project-files', 
        true, 
        104857600,
        ARRAY[
            'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/heic',
            'video/mp4', 'video/quicktime', 'video/webm',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/zip',
            'text/plain',
            'text/csv'
        ]
    )
ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Drop existing policies for project-activities if any
DROP POLICY IF EXISTS "Tenant members can view activity media" ON storage.objects;
DROP POLICY IF EXISTS "Tenant members can insert activity media" ON storage.objects;
DROP POLICY IF EXISTS "Tenant members can update activity media" ON storage.objects;
DROP POLICY IF EXISTS "Tenant members can delete activity media" ON storage.objects;

-- 4. RLS Policy: View / Select activity media & attachments
CREATE POLICY "Tenant members can view activity media"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id IN ('project-activities', 'project-files')
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

-- 5. RLS Policy: Insert / Upload activity media & attachments
CREATE POLICY "Tenant members can insert activity media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id IN ('project-activities', 'project-files')
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

-- 6. RLS Policy: Update activity media & attachments
CREATE POLICY "Tenant members can update activity media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id IN ('project-activities', 'project-files')
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
    bucket_id IN ('project-activities', 'project-files')
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

-- 7. RLS Policy: Delete activity media & attachments
CREATE POLICY "Tenant members can delete activity media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id IN ('project-activities', 'project-files')
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

-- 8. Helper GIN indexes on projects.meta for fast activity & draft retrieval
CREATE INDEX IF NOT EXISTS idx_projects_meta_activities ON public.projects USING gin ((meta -> 'activities'));
CREATE INDEX IF NOT EXISTS idx_projects_meta_draft_activities ON public.projects USING gin ((meta -> 'draftActivities'));

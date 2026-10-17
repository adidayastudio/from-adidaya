-- ==============================================================================
-- FORMA ANNOUNCEMENTS SCHEMA & STORAGE MIGRATION
-- ==============================================================================

-- 1. CREATE ANNOUNCEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.announcements (
    id TEXT PRIMARY KEY,
    tenant_id UUID,
    workspace_id UUID,
    template TEXT NOT NULL DEFAULT 'general',
    title TEXT NOT NULL,
    subtitle TEXT,
    schedule_type TEXT,
    duration TEXT,
    scheduled_date TIMESTAMPTZ,
    cover_image_url TEXT,
    documents JSONB DEFAULT '[]'::jsonb,
    body_content TEXT,
    author_name TEXT,
    author_role TEXT,
    author_avatar_url TEXT,
    created_by UUID,
    is_featured BOOLEAN DEFAULT FALSE,
    target_department TEXT DEFAULT 'All Departments (General)',
    is_draft BOOLEAN DEFAULT FALSE,
    is_withdrawn BOOLEAN DEFAULT FALSE,
    read_by JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_announcements_tenant ON public.announcements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_announcements_workspace ON public.announcements(workspace_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_featured ON public.announcements(is_featured);
CREATE INDEX IF NOT EXISTS idx_announcements_draft ON public.announcements(is_draft);

-- 2. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- 3. RLS POLICIES FOR ANNOUNCEMENTS
DROP POLICY IF EXISTS "Anyone can view active announcements" ON public.announcements;
DROP POLICY IF EXISTS "Anyone can manage announcements" ON public.announcements;

CREATE POLICY "Anyone can view active announcements"
ON public.announcements
FOR SELECT
USING (true);

CREATE POLICY "Anyone can manage announcements"
ON public.announcements
FOR ALL
USING (true)
WITH CHECK (true);

-- 4. ADD DEDICATED STORAGE BUCKET FOR ANNOUNCEMENTS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('announcements', 'announcements', true, 52428800, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 5. STORAGE POLICIES FOR ANNOUNCEMENTS BUCKET
CREATE POLICY "Public can view announcements storage objects"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'announcements');

CREATE POLICY "Authenticated users can upload announcements storage objects"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'announcements');

CREATE POLICY "Authenticated users can update announcements storage objects"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'announcements');

CREATE POLICY "Authenticated users can delete announcements storage objects"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'announcements');

-- Enable Realtime Broadcast for announcements table
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;

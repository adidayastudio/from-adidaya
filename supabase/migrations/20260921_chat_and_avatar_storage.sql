-- ==============================================================================
-- FORMA STORAGE BUCKETS & ACCESS POLICIES MIGRATION
-- Dedicated buckets:
--   1. 'attendance' (Absensi selfie, leaves proof, overtime, business trip attachments)
--   2. 'chat-attachments' / 'chat' (Chat files, media, videos, voice notes, documents)
--   3. 'avatars' (User profiles, channel avatars, department logos)
--   4. 'project-files' (Project drawings, contracts, field reports)
--   5. 'finance-attachments' / 'finance_attachments' (Invoices, receipts, reimbursement bills)
-- ==============================================================================

-- 1. Create or ensure all dedicated buckets exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('attendance', 'attendance', true, 20971520, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'application/pdf']),
    ('avatars', 'avatars', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']),
    ('chat-attachments', 'chat-attachments', true, 52428800, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']),
    ('chat', 'chat', true, 52428800, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'application/pdf']),
    ('project-files', 'project-files', true, 52428800, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'application/pdf']),
    ('finance-attachments', 'finance-attachments', true, 52428800, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'application/pdf']),
    ('finance_attachments', 'finance_attachments', true, 52428800, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'application/pdf']),
    ('from-adidaya', 'from-adidaya', true, 52428800, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Drop existing generic policies if any
DROP POLICY IF EXISTS "Public can view app storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload app storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update app storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete app storage objects" ON storage.objects;

-- 3. Policy: Select / Read (Public & Authenticated)
CREATE POLICY "Public can view app storage objects"
ON storage.objects
FOR SELECT
TO public
USING (
    bucket_id IN (
        'attendance',
        'avatars',
        'chat-attachments',
        'chat',
        'project-files',
        'finance-attachments',
        'finance_attachments',
        'from-adidaya'
    )
);

-- 4. Policy: Insert / Upload (Public & Authenticated)
CREATE POLICY "Authenticated users can upload app storage objects"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
    bucket_id IN (
        'attendance',
        'avatars',
        'chat-attachments',
        'chat',
        'project-files',
        'finance-attachments',
        'finance_attachments',
        'from-adidaya'
    )
);

-- 5. Policy: Update (Public & Authenticated)
CREATE POLICY "Authenticated users can update app storage objects"
ON storage.objects
FOR UPDATE
TO public
USING (
    bucket_id IN (
        'attendance',
        'avatars',
        'chat-attachments',
        'chat',
        'project-files',
        'finance-attachments',
        'finance_attachments',
        'from-adidaya'
    )
);

-- 6. Policy: Delete (Public & Authenticated)
CREATE POLICY "Authenticated users can delete app storage objects"
ON storage.objects
FOR DELETE
TO public
USING (
    bucket_id IN (
        'attendance',
        'avatars',
        'chat-attachments',
        'chat',
        'project-files',
        'finance-attachments',
        'finance_attachments',
        'from-adidaya'
    )
);

-- 7. CHAT CHANNELS TABLE POLICIES (Sync channel meta & avatar_url across platforms)
DROP POLICY IF EXISTS "Users can view accessible channels" ON public.chat_channels;
DROP POLICY IF EXISTS "Authenticated users can manage channels" ON public.chat_channels;
DROP POLICY IF EXISTS "Anyone can view chat channels" ON public.chat_channels;
DROP POLICY IF EXISTS "Anyone can manage chat channels" ON public.chat_channels;

CREATE POLICY "Anyone can view chat channels" ON public.chat_channels
    FOR SELECT
    USING (true);

CREATE POLICY "Anyone can manage chat channels" ON public.chat_channels
    FOR ALL
    USING (true)
    WITH CHECK (true);

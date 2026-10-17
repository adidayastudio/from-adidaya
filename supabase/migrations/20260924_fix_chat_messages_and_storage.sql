-- ==============================================================================
-- FIX CHAT MESSAGES & STORAGE PERMISSIONS MIGRATION (IDEMPOTENT)
-- Ensures seamless file upload & persistent chat message storage across all clients
-- ==============================================================================

-- 1. Ensure Storage Buckets Exist & Are Public without restrictive mime types
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('chat-attachments', 'chat-attachments', true, 104857600, NULL),
    ('chat', 'chat', true, 104857600, NULL),
    ('project-files', 'project-files', true, 104857600, NULL),
    ('avatars', 'avatars', true, 20971520, NULL),
    ('from-adidaya', 'from-adidaya', true, 104857600, NULL),
    ('attendance', 'attendance', true, 52428800, NULL),
    ('finance-attachments', 'finance-attachments', true, 104857600, NULL),
    ('finance_attachments', 'finance_attachments', true, 104857600, NULL)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = NULL;

-- 2. Storage Objects Policies (Drop all existing variants first)
DROP POLICY IF EXISTS "Public can view app storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload app storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update app storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete app storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow all uploads to app storage" ON storage.objects;
DROP POLICY IF EXISTS "Allow all access to app storage" ON storage.objects;
DROP POLICY IF EXISTS "Allow all read on app storage" ON storage.objects;
DROP POLICY IF EXISTS "Allow all insert on app storage" ON storage.objects;
DROP POLICY IF EXISTS "Allow all update on app storage" ON storage.objects;
DROP POLICY IF EXISTS "Allow all delete on app storage" ON storage.objects;

CREATE POLICY "Allow all read on app storage"
ON storage.objects
FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow all insert on app storage"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow all update on app storage"
ON storage.objects
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all delete on app storage"
ON storage.objects
FOR DELETE
TO public
USING (true);

-- 3. Chat Messages RLS Policies (Drop all existing variants first)
ALTER TABLE IF EXISTS public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages up to membership left_at" ON public.chat_messages;
DROP POLICY IF EXISTS "Only active members can insert messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Authenticated users can update/delete messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Authenticated users can delete own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Anyone can view chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Anyone can insert chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Anyone can update chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Anyone can delete chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Anyone can manage chat messages" ON public.chat_messages;

CREATE POLICY "Anyone can view chat messages"
ON public.chat_messages
FOR SELECT
TO public
USING (true);

CREATE POLICY "Anyone can insert chat messages"
ON public.chat_messages
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Anyone can update chat messages"
ON public.chat_messages
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can delete chat messages"
ON public.chat_messages
FOR DELETE
TO public
USING (true);

-- 4. Chat Channels & Members RLS Policies
ALTER TABLE IF EXISTS public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_channel_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view accessible channels" ON public.chat_channels;
DROP POLICY IF EXISTS "Authenticated users can manage channels" ON public.chat_channels;
DROP POLICY IF EXISTS "Anyone can view chat channels" ON public.chat_channels;
DROP POLICY IF EXISTS "Anyone can manage chat channels" ON public.chat_channels;
DROP POLICY IF EXISTS "Channel members can view membership" ON public.chat_channel_members;
DROP POLICY IF EXISTS "Channel members can insert/update membership" ON public.chat_channel_members;
DROP POLICY IF EXISTS "Anyone can manage channel members" ON public.chat_channel_members;
DROP POLICY IF EXISTS "Anyone can view channel members" ON public.chat_channel_members;

CREATE POLICY "Anyone can view chat channels"
ON public.chat_channels
FOR SELECT
TO public
USING (true);

CREATE POLICY "Anyone can manage chat channels"
ON public.chat_channels
FOR ALL
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can manage channel members"
ON public.chat_channel_members
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 5. Realtime & Replication Configuration
ALTER TABLE IF EXISTS public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.chat_channels REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_messages'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_channels'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_channels;
        END IF;
    END IF;
END $$;

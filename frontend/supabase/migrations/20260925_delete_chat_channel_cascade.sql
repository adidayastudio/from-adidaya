-- ==============================================================================
-- CLEAN CHAT SYSTEM POLICIES & CASCADE DELETE RPC (IDEMPOTENT)
-- Enables Full SELECT, INSERT, UPDATE, DELETE on DB Tables and Storage Buckets
-- ==============================================================================

-- 1. STORAGE BUCKETS & POLICIES (No ALTER TABLE on storage.objects)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('chat-attachments', 'chat-attachments', true, 104857600, NULL),
    ('chat', 'chat', true, 104857600, NULL),
    ('avatars', 'avatars', true, 52428800, NULL),
    ('project-files', 'project-files', true, 104857600, NULL)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = NULL;

DROP POLICY IF EXISTS "Public select storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Public insert storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Public update storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Public delete storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow all read on app storage" ON storage.objects;
DROP POLICY IF EXISTS "Allow all insert on app storage" ON storage.objects;
DROP POLICY IF EXISTS "Allow all update on app storage" ON storage.objects;
DROP POLICY IF EXISTS "Allow all delete on app storage" ON storage.objects;

CREATE POLICY "Allow all read on app storage"
ON storage.objects FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow all insert on app storage"
ON storage.objects FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow all update on app storage"
ON storage.objects FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all delete on app storage"
ON storage.objects FOR DELETE
TO public
USING (true);


-- 2. CHAT TABLES ROW LEVEL SECURITY & POLICIES (ALL OPERATIONS)
ALTER TABLE IF EXISTS public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_user_preferences ENABLE ROW LEVEL SECURITY;

-- chat_messages policies
DROP POLICY IF EXISTS "Allow all delete on chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_select_policy" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert_policy" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_update_policy" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_delete_policy" ON public.chat_messages;

CREATE POLICY "chat_messages_select_policy" ON public.chat_messages FOR SELECT TO public USING (true);
CREATE POLICY "chat_messages_insert_policy" ON public.chat_messages FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "chat_messages_update_policy" ON public.chat_messages FOR UPDATE TO public USING (true);
CREATE POLICY "chat_messages_delete_policy" ON public.chat_messages FOR DELETE TO public USING (true);

-- chat_channels policies
DROP POLICY IF EXISTS "Allow all delete on chat_channels" ON public.chat_channels;
DROP POLICY IF EXISTS "chat_channels_select_policy" ON public.chat_channels;
DROP POLICY IF EXISTS "chat_channels_insert_policy" ON public.chat_channels;
DROP POLICY IF EXISTS "chat_channels_update_policy" ON public.chat_channels;
DROP POLICY IF EXISTS "chat_channels_delete_policy" ON public.chat_channels;

CREATE POLICY "chat_channels_select_policy" ON public.chat_channels FOR SELECT TO public USING (true);
CREATE POLICY "chat_channels_insert_policy" ON public.chat_channels FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "chat_channels_update_policy" ON public.chat_channels FOR UPDATE TO public USING (true);
CREATE POLICY "chat_channels_delete_policy" ON public.chat_channels FOR DELETE TO public USING (true);

-- chat_channel_members policies
DROP POLICY IF EXISTS "Allow all delete on chat_channel_members" ON public.chat_channel_members;
DROP POLICY IF EXISTS "chat_channel_members_select_policy" ON public.chat_channel_members;
DROP POLICY IF EXISTS "chat_channel_members_insert_policy" ON public.chat_channel_members;
DROP POLICY IF EXISTS "chat_channel_members_update_policy" ON public.chat_channel_members;
DROP POLICY IF EXISTS "chat_channel_members_delete_policy" ON public.chat_channel_members;

CREATE POLICY "chat_channel_members_select_policy" ON public.chat_channel_members FOR SELECT TO public USING (true);
CREATE POLICY "chat_channel_members_insert_policy" ON public.chat_channel_members FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "chat_channel_members_update_policy" ON public.chat_channel_members FOR UPDATE TO public USING (true);
CREATE POLICY "chat_channel_members_delete_policy" ON public.chat_channel_members FOR DELETE TO public USING (true);

-- chat_user_preferences policies
DROP POLICY IF EXISTS "chat_user_preferences_select_policy" ON public.chat_user_preferences;
DROP POLICY IF EXISTS "chat_user_preferences_insert_policy" ON public.chat_user_preferences;
DROP POLICY IF EXISTS "chat_user_preferences_update_policy" ON public.chat_user_preferences;
DROP POLICY IF EXISTS "chat_user_preferences_delete_policy" ON public.chat_user_preferences;

CREATE POLICY "chat_user_preferences_select_policy" ON public.chat_user_preferences FOR SELECT TO public USING (true);
CREATE POLICY "chat_user_preferences_insert_policy" ON public.chat_user_preferences FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "chat_user_preferences_update_policy" ON public.chat_user_preferences FOR UPDATE TO public USING (true);
CREATE POLICY "chat_user_preferences_delete_policy" ON public.chat_user_preferences FOR DELETE TO public USING (true);


-- 3. STORED PROCEDURE FOR CASCADING CHANNEL & MESSAGE DELETION
CREATE OR REPLACE FUNCTION public.delete_chat_channel_cascade(
    p_channel_id TEXT,
    p_channel_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_messages INT := 0;
    v_deleted_members INT := 0;
    v_deleted_channels INT := 0;
BEGIN
    -- Guard: Prevent deleting the General Channel
    IF p_channel_id IN ('general-channel', '000-gen') OR p_channel_code = '#000-gen' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'General Channel cannot be deleted'
        );
    END IF;

    -- 1. Delete all messages associated with the channel
    WITH deleted_msgs AS (
        DELETE FROM public.chat_messages
        WHERE channel_id = p_channel_id
           OR (p_channel_code IS NOT NULL AND channel_id = p_channel_code)
        RETURNING id
    )
    SELECT count(*) INTO v_deleted_messages FROM deleted_msgs;

    -- 2. Delete all members associated with the channel
    WITH deleted_mems AS (
        DELETE FROM public.chat_channel_members
        WHERE channel_id = p_channel_id
           OR (p_channel_code IS NOT NULL AND channel_id = p_channel_code)
        RETURNING id
    )
    SELECT count(*) INTO v_deleted_members FROM deleted_mems;

    -- 3. Delete the channel record itself
    WITH deleted_chans AS (
        DELETE FROM public.chat_channels
        WHERE id = p_channel_id
           OR (p_channel_code IS NOT NULL AND code = p_channel_code)
        RETURNING id
    )
    SELECT count(*) INTO v_deleted_channels FROM deleted_chans;

    -- 4. Clean up user preferences (remove from pinned/archived JSON arrays)
    UPDATE public.chat_user_preferences
    SET 
        pinned_channels = (
            SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
            FROM jsonb_array_elements_text(pinned_channels) elem
            WHERE elem != p_channel_id AND (p_channel_code IS NULL OR elem != p_channel_code)
        ),
        archived_channels = (
            SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
            FROM jsonb_array_elements_text(archived_channels) elem
            WHERE elem != p_channel_id AND (p_channel_code IS NULL OR elem != p_channel_code)
        )
    WHERE pinned_channels ? p_channel_id 
       OR archived_channels ? p_channel_id
       OR (p_channel_code IS NOT NULL AND (pinned_channels ? p_channel_code OR archived_channels ? p_channel_code));

    RETURN jsonb_build_object(
        'success', true,
        'channel_id', p_channel_id,
        'deleted_messages', v_deleted_messages,
        'deleted_members', v_deleted_members,
        'deleted_channels', v_deleted_channels
    );
END;
$$;

-- 4. GRANT RPC EXECUTION PERMISSIONS
GRANT EXECUTE ON FUNCTION public.delete_chat_channel_cascade(TEXT, TEXT) TO authenticated, anon, service_role;

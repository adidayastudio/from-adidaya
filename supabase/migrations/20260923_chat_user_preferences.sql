-- ==============================================================================
-- CHAT USER PREFERENCES & PROFILES META MIGRATION
-- Enables cross-device sync of user-specific pinned channels and archived channels.
-- ==============================================================================

-- 1. Ensure profiles has meta column
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb;

-- 2. Dedicated chat_user_preferences table per user per workspace
CREATE TABLE IF NOT EXISTS public.chat_user_preferences (
    user_id UUID NOT NULL,
    workspace_id TEXT NOT NULL DEFAULT 'default',
    pinned_channels JSONB DEFAULT '[]'::jsonb,
    archived_channels JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_user_prefs_user ON public.chat_user_preferences(user_id);

-- Enable RLS
ALTER TABLE public.chat_user_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own chat preferences" ON public.chat_user_preferences;
DROP POLICY IF EXISTS "Users can insert own chat preferences" ON public.chat_user_preferences;
DROP POLICY IF EXISTS "Users can update own chat preferences" ON public.chat_user_preferences;
DROP POLICY IF EXISTS "Users can manage own chat preferences" ON public.chat_user_preferences;

-- Create policy for authenticated users to manage their own preferences
CREATE POLICY "Users can manage own chat preferences"
ON public.chat_user_preferences
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Realtime replication
ALTER TABLE IF EXISTS public.chat_user_preferences REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'chat_user_preferences'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_user_preferences;
    END IF;
END $$;

-- ==============================================================================
-- ENABLE SUPABASE REALTIME FOR CHAT
-- ==============================================================================

DO $$
BEGIN
    -- Set REPLICA IDENTITY to FULL so updates/deletes contain full row data
    ALTER TABLE IF EXISTS public.chat_messages REPLICA IDENTITY FULL;
    ALTER TABLE IF EXISTS public.chat_channels REPLICA IDENTITY FULL;

    -- Add tables to supabase_realtime publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'chat_channels'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_channels;
    END IF;
END $$;

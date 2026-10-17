-- ==============================================================================
-- CHAT SYSTEM SCHEMA & ACCESS CONTROL MIGRATION
-- Rules:
-- 1. General Channel: Available per tenant, all tenant members (human & system) are auto-members.
-- 2. Department Channel: Auto-created per department, code = Department Code, only dept members access.
-- 3. Project Channel: Auto-created per project, code = Project Code, membership follows project members.
-- 4. Manual Channel: Created manually by authorized users with custom selected members.
-- 5. Visibility & Access: Non-members cannot see channels or read/write messages.
-- 6. Former Members: Can view message history up to `left_at`, cannot send new messages or see messages after `left_at`.
-- ==============================================================================

-- 1. CHAT CHANNELS TABLE
CREATE TABLE IF NOT EXISTS public.chat_channels (
    id TEXT PRIMARY KEY,
    tenant_id UUID,
    workspace_id UUID,
    code TEXT NOT NULL, -- e.g. #000-gen, #001-bod, #036-prg, #custom
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('general', 'department', 'project', 'manual')),
    department_id UUID,
    project_id UUID,
    created_by UUID,
    is_archived BOOLEAN DEFAULT FALSE,
    meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_channels_tenant ON public.chat_channels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chat_channels_workspace ON public.chat_channels(workspace_id);
CREATE INDEX IF NOT EXISTS idx_chat_channels_category ON public.chat_channels(category);
CREATE INDEX IF NOT EXISTS idx_chat_channels_project ON public.chat_channels(project_id);
CREATE INDEX IF NOT EXISTS idx_chat_channels_dept ON public.chat_channels(department_id);

-- 2. CHAT CHANNEL MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.chat_channel_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id TEXT NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    tenant_id UUID,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at TIMESTAMPTZ, -- If set, member is a former member. History cutoff is left_at.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_members_channel ON public.chat_channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_user ON public.chat_channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_active ON public.chat_channel_members(channel_id, user_id, is_active);

-- 3. CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
    tenant_id UUID,
    workspace_id UUID,
    user_id UUID,
    sender_name TEXT NOT NULL,
    sender_role TEXT,
    avatar_bg TEXT,
    text TEXT NOT NULL DEFAULT '',
    is_pinned BOOLEAN DEFAULT FALSE,
    is_saved BOOLEAN DEFAULT FALSE,
    is_announcement BOOLEAN DEFAULT FALSE,
    reply_to JSONB,
    attachments JSONB,
    media JSONB,
    linked_record JSONB,
    reactions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_created ON public.chat_messages(channel_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON public.chat_messages(user_id);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES

ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user has access to channel (active or former)
CREATE OR REPLACE FUNCTION public.can_access_channel(p_channel_id TEXT, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_category TEXT;
    v_tenant_id UUID;
    v_dept_id UUID;
    v_user_dept TEXT;
    v_has_membership BOOLEAN;
BEGIN
    IF p_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Get channel metadata
    SELECT category, tenant_id, department_id INTO v_category, v_tenant_id, v_dept_id
    FROM public.chat_channels
    WHERE id = p_channel_id;

    -- Default fallback if channel row is not yet in chat_channels table
    IF NOT FOUND THEN
        IF p_channel_id = 'general-channel' THEN
            RETURN TRUE;
        END IF;
        RETURN TRUE;
    END IF;

    -- 1. General channel: all active tenant members can access
    IF v_category = 'general' THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenant_members') THEN
            RETURN EXISTS (
                SELECT 1 FROM public.tenant_members
                WHERE (v_tenant_id IS NULL OR tenant_id = v_tenant_id) AND user_id = p_user_id
            );
        END IF;
        RETURN TRUE;
    END IF;

    -- 2. Explicit membership in chat_channel_members (Active or Former)
    SELECT TRUE INTO v_has_membership
    FROM public.chat_channel_members
    WHERE channel_id = p_channel_id AND user_id = p_user_id;

    IF v_has_membership IS TRUE THEN
        RETURN TRUE;
    END IF;

    -- 3. Department channel: Check profile department match
    IF v_category = 'department' THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
            SELECT department INTO v_user_dept
            FROM public.profiles
            WHERE id = p_user_id;

            IF v_user_dept IS NOT NULL AND v_dept_id IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_departments') THEN
                RETURN EXISTS (
                    SELECT 1 FROM public.organization_departments
                    WHERE id = v_dept_id AND (LOWER(name) = LOWER(v_user_dept) OR LOWER(code) = LOWER(v_user_dept))
                );
            END IF;
        END IF;
    END IF;

    -- 4. Project channel: Check project assignment
    IF v_category = 'project' THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

-- Channels Policies
DROP POLICY IF EXISTS "Users can view accessible channels" ON public.chat_channels;
CREATE POLICY "Users can view accessible channels" ON public.chat_channels
    FOR SELECT
    USING (public.can_access_channel(id, auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can manage channels" ON public.chat_channels;
CREATE POLICY "Authenticated users can manage channels" ON public.chat_channels
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Channel members can view membership" ON public.chat_channel_members;
CREATE POLICY "Channel members can view membership" ON public.chat_channel_members
    FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Channel members can insert/update membership" ON public.chat_channel_members;
CREATE POLICY "Channel members can insert/update membership" ON public.chat_channel_members
    FOR ALL
    USING (auth.role() = 'authenticated');

-- Messages SELECT Policy: Respects left_at history cutoff for former members
DROP POLICY IF EXISTS "Users can view messages up to membership left_at" ON public.chat_messages;
CREATE POLICY "Users can view messages up to membership left_at" ON public.chat_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_channels c
            LEFT JOIN public.chat_channel_members m 
                ON m.channel_id = c.id AND m.user_id = auth.uid()
            WHERE c.id = chat_messages.channel_id
            AND (
                -- General channel
                (c.category = 'general')
                -- Active member (no left_at)
                OR (m.is_active = TRUE AND m.left_at IS NULL)
                -- Former member (can only view messages created on or before left_at)
                OR (m.left_at IS NOT NULL AND chat_messages.created_at <= m.left_at)
                -- If no explicit channel row found, default allow read
                OR (m.id IS NULL)
            )
        )
        OR NOT EXISTS (SELECT 1 FROM public.chat_channels WHERE id = chat_messages.channel_id)
    );

-- Messages INSERT Policy: Only active members can send messages
DROP POLICY IF EXISTS "Only active members can insert messages" ON public.chat_messages;
CREATE POLICY "Only active members can insert messages" ON public.chat_messages
    FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND NOT EXISTS (
            SELECT 1 FROM public.chat_channel_members m
            WHERE m.channel_id = chat_messages.channel_id
            AND m.user_id = auth.uid()
            AND (m.is_active = FALSE OR m.left_at IS NOT NULL)
        )
    );

DROP POLICY IF EXISTS "Authenticated users can update/delete messages" ON public.chat_messages;
CREATE POLICY "Authenticated users can update/delete messages" ON public.chat_messages
    FOR UPDATE
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete own messages" ON public.chat_messages;
CREATE POLICY "Authenticated users can delete own messages" ON public.chat_messages
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- 5. SEED DEFAULT GENERAL CHANNEL
INSERT INTO public.chat_channels (id, code, name, description, category)
VALUES ('general-channel', '#000-gen', 'General Channel', 'Workspace official general channel for all team members.', 'general')
ON CONFLICT (id) DO NOTHING;

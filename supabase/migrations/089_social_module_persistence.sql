-- 089_social_module_persistence.sql
-- Persistence layer for Social Module

-- Create social_accounts table
CREATE TABLE IF NOT EXISTS public.social_accounts (
    id TEXT PRIMARY KEY DEFAULT 'acc-' || gen_random_uuid(),
    name TEXT NOT NULL,
    platform TEXT NOT NULL, -- INSTAGRAM, TIKTOK, LINKEDIN, YOUTUBE, FACEBOOK
    handle TEXT NOT NULL,
    avatar TEXT,
    code TEXT,
    is_active BOOLEAN DEFAULT true,
    quota INTEGER DEFAULT 30,
    content_pillars TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Ensure columns exist for existing tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='social_accounts' AND column_name='code') THEN
        ALTER TABLE public.social_accounts ADD COLUMN code TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='social_accounts' AND column_name='quota') THEN
        ALTER TABLE public.social_accounts ADD COLUMN quota INTEGER DEFAULT 30;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='social_accounts' AND column_name='content_pillars') THEN
        ALTER TABLE public.social_accounts ADD COLUMN content_pillars TEXT[];
    END IF;
END $$;

-- Create social_posts table
CREATE TABLE IF NOT EXISTS public.social_posts (
    id TEXT PRIMARY KEY DEFAULT 'post-' || gen_random_uuid(),
    account_id TEXT REFERENCES public.social_accounts(id) ON DELETE CASCADE,
    platform TEXT NOT NULL, -- INSTAGRAM, TIKTOK, etc.
    title TEXT NOT NULL,
    caption TEXT,
    content_type TEXT NOT NULL, -- FEED, REEL, STORY, VIDEO, CAROUSEL, TEXT
    content_pillar TEXT,
    content_references TEXT[],
    scheduled_date DATE NOT NULL,
    scheduled_time TIME,
    status TEXT NOT NULL DEFAULT 'NOT_STARTED', -- NOT_STARTED, TODO, WRITING, etc.
    priority TEXT DEFAULT 'MID', -- URGENT, HIGH, MID, LOW
    assignee TEXT,
    published_url TEXT,
    insights JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Ensure columns exist for social_posts
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='social_posts' AND column_name='content_references') THEN
        ALTER TABLE public.social_posts ADD COLUMN content_references TEXT[];
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='social_posts' AND column_name='storyboard') THEN
        ALTER TABLE public.social_posts ADD COLUMN storyboard JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

-- Public Access Policies (Matching project patterns)
DROP POLICY IF EXISTS "Public Read Access Social Accounts" ON public.social_accounts;
CREATE POLICY "Public Read Access Social Accounts" ON public.social_accounts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Insert Access Social Accounts" ON public.social_accounts;
CREATE POLICY "Public Insert Access Social Accounts" ON public.social_accounts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public Update Access Social Accounts" ON public.social_accounts;
CREATE POLICY "Public Update Access Social Accounts" ON public.social_accounts FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public Delete Access Social Accounts" ON public.social_accounts;
CREATE POLICY "Public Delete Access Social Accounts" ON public.social_accounts FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public Read Access Social Posts" ON public.social_posts;
CREATE POLICY "Public Read Access Social Posts" ON public.social_posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Insert Access Social Posts" ON public.social_posts;
CREATE POLICY "Public Insert Access Social Posts" ON public.social_posts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public Update Access Social Posts" ON public.social_posts;
CREATE POLICY "Public Update Access Social Posts" ON public.social_posts FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public Delete Access Social Posts" ON public.social_posts;
CREATE POLICY "Public Delete Access Social Posts" ON public.social_posts FOR DELETE USING (true);

-- Functions & Triggers for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_social_accounts_updated ON public.social_accounts;
CREATE TRIGGER on_social_accounts_updated
    BEFORE UPDATE ON public.social_accounts
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS on_social_posts_updated ON public.social_posts;
CREATE TRIGGER on_social_posts_updated
    BEFORE UPDATE ON public.social_posts
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

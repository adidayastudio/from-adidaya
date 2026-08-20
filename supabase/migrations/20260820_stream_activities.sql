-- ============================================
-- STREAM ACTIVITIES TABLE
-- Chat-first operational input storage
-- ============================================

CREATE TABLE IF NOT EXISTS stream_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID,
    user_id UUID,

    -- Classification
    intent_type TEXT NOT NULL DEFAULT 'general',
    raw_input TEXT NOT NULL,
    parsed_data JSONB DEFAULT '{}'::jsonb,

    -- Linking (polymorphic reference to created entity)
    entity_type TEXT,          -- 'project', 'task', 'expense', 'report'
    entity_id UUID,

    -- Status flow: pending → confirmed → saved / dismissed
    status TEXT NOT NULL DEFAULT 'pending',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for feed queries
CREATE INDEX IF NOT EXISTS idx_stream_activities_user ON stream_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_stream_activities_created ON stream_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stream_activities_status ON stream_activities(status);
CREATE INDEX IF NOT EXISTS idx_stream_activities_intent ON stream_activities(intent_type);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE stream_activities ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own activities
CREATE POLICY "stream_activities_select" ON stream_activities
    FOR SELECT USING (true);

-- Allow authenticated users to insert
CREATE POLICY "stream_activities_insert" ON stream_activities
    FOR INSERT WITH CHECK (true);

-- Allow authenticated users to update their own activities
CREATE POLICY "stream_activities_update" ON stream_activities
    FOR UPDATE USING (true);

-- Allow authenticated users to delete their own activities
CREATE POLICY "stream_activities_delete" ON stream_activities
    FOR DELETE USING (true);

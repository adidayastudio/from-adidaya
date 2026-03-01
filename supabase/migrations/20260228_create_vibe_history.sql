-- Migration: Create Vibe History
-- Date: 2026-02-28
-- Description: Stores weekly work persona snapshots for profiles.

CREATE TABLE IF NOT EXISTS people_vibe_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    persona_type TEXT NOT NULL,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    metrics JSONB NOT NULL DEFAULT '{}',
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure one record per week per profile
    UNIQUE(profile_id, week_start)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_vibe_history_profile_id ON people_vibe_history(profile_id);
CREATE INDEX IF NOT EXISTS idx_vibe_history_week_start ON people_vibe_history(week_start);

-- RLS
ALTER TABLE people_vibe_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own vibe history"
    ON people_vibe_history FOR SELECT
    USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert their own vibe history"
    ON people_vibe_history FOR INSERT
    WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own unlocked vibe history"
    ON people_vibe_history FOR UPDATE
    USING (auth.uid() = profile_id AND is_locked = FALSE);

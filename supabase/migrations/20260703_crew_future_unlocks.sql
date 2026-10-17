-- Migration: Crew Future Date Unlocks Setup
-- Date: 2026-07-03
-- Description: Table to store unlocked future dates for crew attendance logs to allow advance/urgent submission.

CREATE TABLE IF NOT EXISTS public.crew_future_unlocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    project_code TEXT NOT NULL,
    unlocked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workspace_id, date, project_code)
);

-- Enable RLS
ALTER TABLE IF EXISTS public.crew_future_unlocks ENABLE ROW LEVEL SECURITY;

-- Permissive Policy matching crew_daily_logs
DROP POLICY IF EXISTS "crew_future_unlocks_permissive" ON public.crew_future_unlocks;
CREATE POLICY "crew_future_unlocks_permissive"
ON public.crew_future_unlocks
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Grant privileges
GRANT ALL ON public.crew_future_unlocks TO authenticated;
GRANT ALL ON public.crew_future_unlocks TO service_role;
GRANT ALL ON public.crew_future_unlocks TO anon;

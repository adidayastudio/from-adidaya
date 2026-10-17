-- Create crew_daily_logs table
CREATE TABLE IF NOT EXISTS public.crew_daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    crew_id UUID NOT NULL REFERENCES public.crew_members(id) ON DELETE CASCADE,
    project_code TEXT, -- Loose coupling to project code (suffix or full)
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PRESENT', 'ABSENT', 'HALF_DAY', 'CUTI')),
    regular_hours NUMERIC DEFAULT 0,
    ot1_hours NUMERIC DEFAULT 0,
    ot2_hours NUMERIC DEFAULT 0,
    ot3_hours NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(crew_id, date, project_code) -- Prevent duplicate entries for same crew/date/project
);

-- Enable RLS
ALTER TABLE public.crew_daily_logs ENABLE ROW LEVEL SECURITY;

-- Policies (Using same public access pattern for now to match current debugging state, 
-- but ideally should be Authenticated Users only. Following current pattern of 038_public_access_crew)
CREATE POLICY "Allow public access for now" ON public.crew_daily_logs
    FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crew_daily_logs_workspace ON public.crew_daily_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_crew_daily_logs_crew_date ON public.crew_daily_logs(crew_id, date);
CREATE INDEX IF NOT EXISTS idx_crew_daily_logs_project ON public.crew_daily_logs(project_code);

-- ==========================================
-- TASKS (Adidaya Task Management)
-- Represents work items assigned to users securely in a unified table.
-- Tasks belong to a specific project and optionally a WBS.
-- ==========================================

CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Relationships
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    wbs_id UUID REFERENCES public.project_wbs_items(id) ON DELETE SET NULL,
    
    -- Dates
    deadline_date DATE NOT NULL,
    deadline_time TIME,
    
    -- Enums & Config
    status VARCHAR(50) NOT NULL DEFAULT 'TODO', -- TODO, IN PROGRESS, REVISION, DONE
    priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM', -- URGENT, HIGH, MEDIUM, LOW
    
    -- Creator / Owner Tracking
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Task Assignees (Many-to-Many bridge table)
CREATE TABLE IF NOT EXISTS public.task_assignees (
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (task_id, user_id)
);

-- ==========================================
-- ACTIONS (Adidaya Action / Approvals Management)
-- Represents review items (Approve, Reject, Revision) required for a submission or task.
-- ==========================================

CREATE TABLE IF NOT EXISTS public.actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Context
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    wbs_id UUID REFERENCES public.project_wbs_items(id) ON DELETE SET NULL,
    
    -- Optional reference to a Task that triggered this Action (e.g. a Task was Submitted)
    source_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    
    -- Dates
    deadline_date DATE NOT NULL,
    deadline_time TIME,
    
    -- Enums & Config
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, REVISION, DISPUTE
    priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM', -- URGENT, HIGH, MEDIUM, LOW
    
    -- Action Requester (who asked for the approval)
    requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Action Reviewers (Many-to-Many bridge table)
CREATE TABLE IF NOT EXISTS public.action_reviewers (
    action_id UUID REFERENCES public.actions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (action_id, user_id)
);

-- ==========================================
-- RLS POLICIES
-- ==========================================

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_reviewers ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read and insert tasks and actions for now
CREATE POLICY "Enable read access for all users" ON public.tasks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users only" ON public.tasks FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON public.tasks FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all users" ON public.task_assignees FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users only" ON public.task_assignees FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON public.task_assignees FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all users" ON public.actions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users only" ON public.actions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON public.actions FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all users" ON public.action_reviewers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users only" ON public.action_reviewers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON public.action_reviewers FOR UPDATE USING (auth.role() = 'authenticated');

-- ==========================================
-- TRIGGERS FOR UPDATED_AT
-- ==========================================

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tasks_modtime
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_actions_modtime
    BEFORE UPDATE ON public.actions
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();

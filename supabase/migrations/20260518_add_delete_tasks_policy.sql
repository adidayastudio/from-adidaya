-- ==========================================================
-- Enable DELETE policies for Tasks and Task Assignees tables
-- ==========================================================

-- 1. Policies for public.tasks
DROP POLICY IF EXISTS "Enable delete for task creators and managers" ON public.tasks;
CREATE POLICY "Enable delete for task creators and managers"
    ON public.tasks FOR DELETE
    TO authenticated
    USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superadmin', 'supervisor', 'manager', 'pm')
        )
    );

-- 2. Policies for public.task_assignees
DROP POLICY IF EXISTS "Enable delete for task assignees" ON public.task_assignees;
CREATE POLICY "Enable delete for task assignees"
    ON public.task_assignees FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = task_id
            AND (
                tasks.created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.user_roles 
                    WHERE user_roles.user_id = auth.uid() 
                    AND user_roles.role IN ('admin', 'superadmin', 'supervisor', 'manager', 'pm')
                )
            )
        )
    );

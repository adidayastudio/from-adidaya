-- Migration: Add missing columns to projects and create project template tables
-- Ensure safe execution with IF NOT EXISTS / ADD COLUMN IF NOT EXISTS

-- 1. Ensure projects table has all required columns
ALTER TABLE IF EXISTS public.projects 
    ADD COLUMN IF NOT EXISTS hero_image_url text,
    ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS location jsonb,
    ADD COLUMN IF NOT EXISTS phase text DEFAULT 'Planning',
    ADD COLUMN IF NOT EXISTS progress numeric DEFAULT 0;

-- 2. Project Type Templates table
CREATE TABLE IF NOT EXISTS public.project_type_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
    project_type_id text NOT NULL,
    code text,
    name text NOT NULL,
    description text,
    icon text,
    color text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 3. Typologies table
CREATE TABLE IF NOT EXISTS public.typologies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
    code text,
    name text NOT NULL,
    parent_id uuid REFERENCES public.typologies(id) ON DELETE SET NULL,
    linked_project_types text[] DEFAULT '{}'::text[],
    complexity_level text DEFAULT 'Medium',
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 4. Disciplines table
CREATE TABLE IF NOT EXISTS public.disciplines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
    code text,
    name text NOT NULL,
    description text,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 5. Classes table
CREATE TABLE IF NOT EXISTS public.classes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
    code text,
    name text NOT NULL,
    description text,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 6. Stage Templates table
CREATE TABLE IF NOT EXISTS public.stage_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
    project_type_id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    weight integer DEFAULT 10,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 7. Stage Task Templates table
CREATE TABLE IF NOT EXISTS public.stage_task_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
    stage_template_id uuid REFERENCES public.stage_templates(id) ON DELETE CASCADE,
    code text NOT NULL,
    title text NOT NULL,
    description text,
    weight integer DEFAULT 10,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS for newly created tables
ALTER TABLE public.project_type_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_task_templates ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation RLS Policies
DROP POLICY IF EXISTS "tenant_isolation_project_type_templates" ON public.project_type_templates;
CREATE POLICY "tenant_isolation_project_type_templates" ON public.project_type_templates
    FOR ALL
    USING (
        workspace_id IN (
            SELECT w.id FROM public.workspaces w
            JOIN public.tenant_members tm ON tm.tenant_id = w.tenant_id
            WHERE tm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "tenant_isolation_typologies" ON public.typologies;
CREATE POLICY "tenant_isolation_typologies" ON public.typologies
    FOR ALL
    USING (
        workspace_id IN (
            SELECT w.id FROM public.workspaces w
            JOIN public.tenant_members tm ON tm.tenant_id = w.tenant_id
            WHERE tm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "tenant_isolation_disciplines" ON public.disciplines;
CREATE POLICY "tenant_isolation_disciplines" ON public.disciplines
    FOR ALL
    USING (
        workspace_id IN (
            SELECT w.id FROM public.workspaces w
            JOIN public.tenant_members tm ON tm.tenant_id = w.tenant_id
            WHERE tm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "tenant_isolation_classes" ON public.classes;
CREATE POLICY "tenant_isolation_classes" ON public.classes
    FOR ALL
    USING (
        workspace_id IN (
            SELECT w.id FROM public.workspaces w
            JOIN public.tenant_members tm ON tm.tenant_id = w.tenant_id
            WHERE tm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "tenant_isolation_stage_templates" ON public.stage_templates;
CREATE POLICY "tenant_isolation_stage_templates" ON public.stage_templates
    FOR ALL
    USING (
        workspace_id IN (
            SELECT w.id FROM public.workspaces w
            JOIN public.tenant_members tm ON tm.tenant_id = w.tenant_id
            WHERE tm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "tenant_isolation_stage_task_templates" ON public.stage_task_templates;
CREATE POLICY "tenant_isolation_stage_task_templates" ON public.stage_task_templates
    FOR ALL
    USING (
        workspace_id IN (
            SELECT w.id FROM public.workspaces w
            JOIN public.tenant_members tm ON tm.tenant_id = w.tenant_id
            WHERE tm.user_id = auth.uid()
        )
    );

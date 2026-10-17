-- ==============================================================================
-- AUTO-GENERATE CHAT CHANNELS ON ENTITY CREATION TRIGGER MIGRATION
-- 
-- Flow:
-- 1. Create Tenant -> Generates Tenant UUID -> Triggers auto-creation of General Channel (#000-gen)
-- 2. Create Department -> Generates Department UUID (linked to tenant_id) -> Triggers auto-creation of Department Channel (#xxx-dept)
-- 3. Create Project -> Generates Project UUID (linked to tenant_id) -> Triggers auto-creation of Project Channel (#xxx-proj)
-- ==============================================================================

-- 1. FUNCTION: Auto-create General Channel on Tenant / Workspace insert
CREATE OR REPLACE FUNCTION public.trg_auto_create_general_channel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
    v_channel_id TEXT;
    v_row JSONB;
BEGIN
    v_row := to_jsonb(NEW);
    v_tenant_id := (v_row->>'id')::uuid;
    IF v_tenant_id IS NULL THEN
        RETURN NEW;
    END IF;

    v_channel_id := 'gen-' || v_tenant_id::text;

    -- Upsert General Channel for this specific tenant
    INSERT INTO public.chat_channels (
        id,
        tenant_id,
        workspace_id,
        code,
        name,
        description,
        category,
        is_archived,
        created_at,
        updated_at
    )
    VALUES (
        v_channel_id,
        v_tenant_id,
        v_tenant_id,
        '#000-gen',
        'General Channel',
        'Official workspace general discussion channel for all team members.',
        'general',
        FALSE,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        tenant_id = EXCLUDED.tenant_id,
        workspace_id = EXCLUDED.workspace_id,
        updated_at = NOW();

    RETURN NEW;
END;
$$;

-- 2. FUNCTION: Auto-create Department Channel on Department insert/update
CREATE OR REPLACE FUNCTION public.trg_auto_create_department_channel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_row JSONB;
    v_id UUID;
    v_tenant_id UUID;
    v_workspace_id UUID;
    v_channel_id TEXT;
    v_code_num TEXT;
    v_code_tag TEXT;
    v_channel_code TEXT;
    v_num INTEGER;
    v_name TEXT;
    v_desc TEXT;
BEGIN
    v_row := to_jsonb(NEW);
    v_id := (v_row->>'id')::uuid;
    IF v_id IS NULL THEN
        RETURN NEW;
    END IF;

    v_channel_id := 'dept-' || v_id::text;
    
    BEGIN
        v_tenant_id := (v_row->>'tenant_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
        v_tenant_id := NULL;
    END;

    BEGIN
        v_workspace_id := COALESCE((v_row->>'workspace_id')::uuid, v_tenant_id);
    EXCEPTION WHEN OTHERS THEN
        v_workspace_id := v_tenant_id;
    END;

    -- Format channel code e.g. #001-bod
    BEGIN
        v_num := COALESCE((v_row->>'cluster_code')::integer, (v_row->>'order_index')::integer, 1);
    EXCEPTION WHEN OTHERS THEN
        v_num := 1;
    END;

    v_code_num := LPAD(v_num::text, 3, '0');
    v_code_tag := LOWER(REGEXP_REPLACE(COALESCE(v_row->>'code', v_row->>'name', 'dept'), '[^a-zA-Z0-9]', '', 'g'));
    IF v_code_tag = '' THEN
        v_code_tag := 'dept';
    END IF;
    v_channel_code := '#' || v_code_num || '-' || v_code_tag;
    v_name := COALESCE(v_row->>'name', 'Department');
    v_desc := COALESCE(v_row->>'description', 'Department discussions and announcements.');

    INSERT INTO public.chat_channels (
        id,
        tenant_id,
        workspace_id,
        department_id,
        code,
        name,
        description,
        category,
        is_archived,
        created_at,
        updated_at
    )
    VALUES (
        v_channel_id,
        v_tenant_id,
        v_workspace_id,
        v_id,
        v_channel_code,
        v_name,
        v_desc,
        'department',
        FALSE,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        name = EXCLUDED.name,
        code = EXCLUDED.code,
        description = EXCLUDED.description,
        tenant_id = EXCLUDED.tenant_id,
        workspace_id = EXCLUDED.workspace_id,
        department_id = EXCLUDED.department_id,
        updated_at = NOW();

    RETURN NEW;
END;
$$;

-- 3. FUNCTION: Auto-create Project Channel on Project insert/update
CREATE OR REPLACE FUNCTION public.trg_auto_create_project_channel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_row JSONB;
    v_id UUID;
    v_tenant_id UUID;
    v_workspace_id UUID;
    v_channel_id TEXT;
    v_code_num TEXT;
    v_code_tag TEXT;
    v_channel_code TEXT;
    v_num_str TEXT;
    v_proj_name TEXT;
    v_desc TEXT;
    v_archived BOOLEAN;
BEGIN
    v_row := to_jsonb(NEW);
    v_id := (v_row->>'id')::uuid;
    IF v_id IS NULL THEN
        RETURN NEW;
    END IF;

    v_channel_id := 'proj-' || v_id::text;

    BEGIN
        v_tenant_id := (v_row->>'tenant_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
        v_tenant_id := NULL;
    END;

    BEGIN
        v_workspace_id := COALESCE((v_row->>'workspace_id')::uuid, v_tenant_id);
    EXCEPTION WHEN OTHERS THEN
        v_workspace_id := v_tenant_id;
    END;
    
    -- Format channel code e.g. #036-prj
    v_num_str := COALESCE(v_row->>'project_number', v_row->>'number', '1');
    BEGIN
        v_code_num := LPAD(v_num_str::integer::text, 3, '0');
    EXCEPTION WHEN OTHERS THEN
        v_code_num := '001';
    END;

    v_code_tag := LOWER(REGEXP_REPLACE(COALESCE(v_row->>'project_code', v_row->>'code', 'prj'), '[^a-zA-Z0-9]', '', 'g'));
    IF v_code_tag = '' THEN
        v_code_tag := 'prj';
    END IF;
    v_channel_code := '#' || v_code_num || '-' || v_code_tag;
    v_proj_name := COALESCE(v_row->>'name', v_row->>'title', 'Project');
    v_desc := COALESCE(v_row->>'description', 'Project discussion for ' || v_proj_name);
    v_archived := COALESCE((v_row->>'is_archived')::boolean, FALSE);

    INSERT INTO public.chat_channels (
        id,
        tenant_id,
        workspace_id,
        project_id,
        code,
        name,
        description,
        category,
        is_archived,
        created_at,
        updated_at
    )
    VALUES (
        v_channel_id,
        v_tenant_id,
        v_workspace_id,
        v_id,
        v_channel_code,
        v_proj_name,
        v_desc,
        'project',
        v_archived,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        name = EXCLUDED.name,
        code = EXCLUDED.code,
        tenant_id = EXCLUDED.tenant_id,
        workspace_id = EXCLUDED.workspace_id,
        project_id = EXCLUDED.project_id,
        is_archived = EXCLUDED.is_archived,
        updated_at = NOW();

    RETURN NEW;
END;
$$;

-- 4. ATTACH TRIGGERS DYNAMICALLY IF TARGET TABLES EXIST

-- Triggers for tenants / workspaces
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenants') THEN
        DROP TRIGGER IF EXISTS trg_tenant_create_general_channel ON public.tenants;
        CREATE TRIGGER trg_tenant_create_general_channel
            AFTER INSERT ON public.tenants
            FOR EACH ROW
            EXECUTE FUNCTION public.trg_auto_create_general_channel();
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspaces') THEN
        DROP TRIGGER IF EXISTS trg_workspace_create_general_channel ON public.workspaces;
        CREATE TRIGGER trg_workspace_create_general_channel
            AFTER INSERT ON public.workspaces
            FOR EACH ROW
            EXECUTE FUNCTION public.trg_auto_create_general_channel();
    END IF;
END;
$$;

-- Triggers for departments
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_departments') THEN
        DROP TRIGGER IF EXISTS trg_dept_create_channel ON public.organization_departments;
        CREATE TRIGGER trg_dept_create_channel
            AFTER INSERT OR UPDATE ON public.organization_departments
            FOR EACH ROW
            EXECUTE FUNCTION public.trg_auto_create_department_channel();
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'departments') THEN
        DROP TRIGGER IF EXISTS trg_dept_create_channel_alt ON public.departments;
        CREATE TRIGGER trg_dept_create_channel_alt
            AFTER INSERT OR UPDATE ON public.departments
            FOR EACH ROW
            EXECUTE FUNCTION public.trg_auto_create_department_channel();
    END IF;
END;
$$;

-- Triggers for projects
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
        DROP TRIGGER IF EXISTS trg_project_create_channel ON public.projects;
        CREATE TRIGGER trg_project_create_channel
            AFTER INSERT OR UPDATE ON public.projects
            FOR EACH ROW
            EXECUTE FUNCTION public.trg_auto_create_project_channel();
    END IF;
END;
$$;

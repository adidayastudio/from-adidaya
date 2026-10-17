-- ==============================================================================
-- COMPREHENSIVE ADIDAYA TENANT & WORKSPACE SYNC MIGRATION
-- Modules Covered: Finance, Resources, People/Clock, Projects, Tasks, Reports & Chat
-- ==============================================================================

-- 1. Setup Chat Tables (If not yet existing)
CREATE TABLE IF NOT EXISTS public.chat_channels (
    id TEXT PRIMARY KEY,
    tenant_id UUID,
    workspace_id UUID,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'general',
    department_id UUID,
    project_id UUID,
    created_by UUID,
    is_archived BOOLEAN DEFAULT FALSE,
    meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure tenants table columns and RLS exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants' AND table_schema = 'public') THEN
    ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS branding_name TEXT;
    ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS branding_logo_url TEXT;
    ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#0036F8';
    ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS company_code TEXT;
    ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS join_code TEXT;
    ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS address TEXT;
    ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS gmaps_url TEXT;
    ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
    ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
    ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS attendance_radius NUMERIC DEFAULT 50;
    ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS contact_email TEXT;
    ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS contact_phone TEXT;
    ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

    ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS allow_auth_all_tenants ON public.tenants;
    CREATE POLICY allow_auth_all_tenants ON public.tenants FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.chat_channel_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id TEXT NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    tenant_id UUID,
    role TEXT NOT NULL DEFAULT 'member',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (channel_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
    tenant_id UUID,
    workspace_id UUID,
    sender_id UUID NOT NULL,
    sender_name TEXT,
    sender_avatar TEXT,
    sender_role TEXT,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text',
    attachments JSONB DEFAULT '[]'::jsonb,
    reply_to_id TEXT,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Link All Tables to Tenant Adidaya & Default Workspace
DO $$
DECLARE
  adidaya_tenant_id UUID;
  adidaya_ws_id UUID;
  tbl RECORD;
  target_tables TEXT[] := ARRAY[
    -- Projects & Tasks
    'projects', 'project_wbs_items', 'tasks', 'task_assignees', 'task_comments', 'actions', 'action_reviewers',
    -- Finance Module
    'purchasing_requests', 'purchasing_items', 'purchasing_invoices',
    'reimbursement_requests', 'reimbursement_items',
    'petty_cash_requests', 'petty_cash_items',
    'funding_sources', 'funding_source_transactions',
    'finance_categories', 'finance_accounts',
    -- Resources Module
    'resources', 'resource_locations', 'resource_categories', 'resource_conditions',
    'resource_statuses', 'resource_receivings', 'resource_transfers', 'resource_vendors', 'resource_stock_rules',
    -- People & Clock Module
    'attendance_records', 'attendance_sessions', 'attendance_corrections',
    'leave_requests', 'leave_policies', 'work_schedules', 'organization_departments',
    -- Reports Module
    'reports', 'report_types', 'report_templates', 'project_activities',
    -- Chat Module
    'chat_channels', 'chat_messages'
  ];
  t_name TEXT;
BEGIN
  -- Ambil ID Tenant Adidaya & Workspace
  SELECT id INTO adidaya_tenant_id FROM tenants WHERE company_code = 'ADIDAYA' LIMIT 1;
  SELECT id INTO adidaya_ws_id FROM workspaces WHERE tenant_id = adidaya_tenant_id LIMIT 1;

  -- Loop melalui semua tabel yang ada di database
  FOREACH t_name IN ARRAY target_tables
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t_name AND table_schema = 'public') THEN
      -- Tambah kolom tenant_id & workspace_id jika belum ada
      BEGIN
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id)', t_name);
        EXECUTE format('UPDATE public.%I SET tenant_id = %L WHERE tenant_id IS NULL', t_name, adidaya_tenant_id);
      EXCEPTION WHEN OTHERS THEN NULL;
      END;

      BEGIN
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id)', t_name);
        EXECUTE format('UPDATE public.%I SET workspace_id = %L WHERE workspace_id IS NULL', t_name, adidaya_ws_id);
      EXCEPTION WHEN OTHERS THEN NULL;
      END;

      -- Aktifkan RLS dan buat policy akses universal untuk user authenticated
      BEGIN
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t_name);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'allow_auth_all_' || t_name, t_name);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', 'allow_auth_all_' || t_name, t_name);
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;
  END LOOP;

  -- Auto-create / link General Channel
  INSERT INTO chat_channels (id, tenant_id, workspace_id, code, name, description, category)
  VALUES (
    '000-general',
    adidaya_tenant_id,
    adidaya_ws_id,
    '#000-gen',
    'General',
    'Main workspace discussion channel',
    'general'
  )
  ON CONFLICT (id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    workspace_id = EXCLUDED.workspace_id;

  -- Auto-add seluruh user profiles ke general channel
  INSERT INTO chat_channel_members (channel_id, user_id, tenant_id, role, is_active)
  SELECT 
    '000-general',
    p.id,
    adidaya_tenant_id,
    'member',
    true
  FROM profiles p
  ON CONFLICT (channel_id, user_id) DO NOTHING;

  -- Auto-add seluruh user profiles ke tenant_members Adidaya
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_members' AND table_schema = 'public') THEN
    INSERT INTO tenant_members (tenant_id, user_id, role, status)
    SELECT 
      adidaya_tenant_id,
      p.id,
      'member',
      'active'
    FROM profiles p
    ON CONFLICT (tenant_id, user_id) DO NOTHING;

    -- Update roles if user_roles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles' AND table_schema = 'public') THEN
      BEGIN
        UPDATE tenant_members tm
        SET role = CASE 
          WHEN ur.role ILIKE '%super%' THEN 'Super Admin'
          WHEN ur.role ILIKE '%admin%' THEN 'Admin'
          ELSE ur.role
        END
        FROM user_roles ur
        WHERE tm.user_id = ur.user_id AND tm.tenant_id = adidaya_tenant_id;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;
  END IF;

END $$;

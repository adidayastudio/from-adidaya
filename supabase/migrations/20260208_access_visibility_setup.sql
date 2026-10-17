-- Migration: Access & Visibility Setup
-- Date: 2026-02-08
-- Description: Tables for role-based capabilities, visibility, and approvals.

-- 1. Create Enums for Visibility
DO $$ BEGIN
    CREATE TYPE visibility_level AS ENUM ('Public', 'Internal', 'Restricted', 'Sensitive');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE visibility_scope AS ENUM ('Self', 'Team', 'Global');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Role Permissions Table
CREATE TABLE IF NOT EXISTS organization_role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES organization_system_roles(id) ON DELETE CASCADE,
    
    -- Capabilities (Boolean)
    can_view_directory BOOLEAN DEFAULT true,
    can_manage_people BOOLEAN DEFAULT false,
    can_view_performance_summary BOOLEAN DEFAULT false,
    can_view_performance_detail BOOLEAN DEFAULT false,
    
    -- Data Visibility
    visibility_level visibility_level DEFAULT 'Public',
    visibility_scope visibility_scope DEFAULT 'Self',
    
    -- Approval Authority
    can_approve_leave BOOLEAN DEFAULT false,
    can_approve_overtime BOOLEAN DEFAULT false,
    can_approve_expense BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(role_id)
);

-- 3. Update Organization Positions to link with System Roles
-- This decouples access policies (Roles) from org structure (Positions)
ALTER TABLE organization_positions 
ADD COLUMN IF NOT EXISTS system_role_id UUID REFERENCES organization_system_roles(id) ON DELETE SET NULL;

-- 4. RLS
ALTER TABLE organization_role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View Role Permissions" ON organization_role_permissions;
CREATE POLICY "View Role Permissions" ON organization_role_permissions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Manage Role Permissions" ON organization_role_permissions;
CREATE POLICY "Manage Role Permissions" ON organization_role_permissions FOR ALL USING (auth.role() = 'authenticated');

-- 4. Seed Initial Permissions Based on Requirements
-- We'll match by code from organization_system_roles

INSERT INTO organization_role_permissions (role_id, can_view_directory, can_manage_people, can_view_performance_summary, can_view_performance_detail, visibility_level, visibility_scope, can_approve_leave, can_approve_overtime, can_approve_expense)
SELECT 
    id, 
    true, true, true, true, -- Full capabilities
    'Sensitive', 'Global', -- Full visibility
    true, true, true        -- Full approvals
FROM organization_system_roles WHERE code = 'SUPERADMIN'
ON CONFLICT (role_id) DO UPDATE SET
    can_view_directory = EXCLUDED.can_view_directory,
    can_manage_people = EXCLUDED.can_manage_people,
    can_view_performance_summary = EXCLUDED.can_view_performance_summary,
    can_view_performance_detail = EXCLUDED.can_view_performance_detail,
    visibility_level = EXCLUDED.visibility_level,
    visibility_scope = EXCLUDED.visibility_scope,
    can_approve_leave = EXCLUDED.can_approve_leave,
    can_approve_overtime = EXCLUDED.can_approve_overtime,
    can_approve_expense = EXCLUDED.can_approve_expense;

-- Admin: Manage people, Internal visibility (Global), No sensitive/KPI detail automatically
INSERT INTO organization_role_permissions (role_id, can_view_directory, can_manage_people, can_view_performance_summary, can_view_performance_detail, visibility_level, visibility_scope, can_approve_leave, can_approve_overtime, can_approve_expense)
SELECT 
    id, 
    true, true, false, false,
    'Internal', 'Global',
    false, false, false
FROM organization_system_roles WHERE code = 'ADMIN'
ON CONFLICT (role_id) DO NOTHING;

-- Supervisor: View Directory, Approve all, KPI Summary (Restricted), Cross-team (Global scope but limited level)
INSERT INTO organization_role_permissions (role_id, can_view_directory, can_manage_people, can_view_performance_summary, can_view_performance_detail, visibility_level, visibility_scope, can_approve_leave, can_approve_overtime, can_approve_expense)
SELECT 
    id, 
    true, false, true, false,
    'Restricted', 'Global',
    true, true, true
FROM organization_system_roles WHERE code = 'SUPERVISOR'
ON CONFLICT (role_id) DO NOTHING;

-- HR: Access legal & personal data (Sensitive), No KPI (performance)
INSERT INTO organization_role_permissions (role_id, can_view_directory, can_manage_people, can_view_performance_summary, can_view_performance_detail, visibility_level, visibility_scope, can_approve_leave, can_approve_overtime, can_approve_expense)
SELECT 
    id, 
    true, true, false, false,
    'Sensitive', 'Global',
    false, false, false
FROM organization_system_roles WHERE code = 'HR'
ON CONFLICT (role_id) DO NOTHING;

-- Finance: KPI-based indicators (Restricted), No cross-domain?
INSERT INTO organization_role_permissions (role_id, can_view_directory, can_manage_people, can_view_performance_summary, can_view_performance_detail, visibility_level, visibility_scope, can_approve_leave, can_approve_overtime, can_approve_expense)
SELECT 
    id, 
    true, false, true, false,
    'Restricted', 'Team',
    false, false, false
FROM organization_system_roles WHERE code = 'FINANCE'
ON CONFLICT (role_id) DO NOTHING;

-- Staff: Internal visibility (Team scope for details, Public for global), No KPI/Performance
INSERT INTO organization_role_permissions (role_id, can_view_directory, can_manage_people, can_view_performance_summary, can_view_performance_detail, visibility_level, visibility_scope, can_approve_leave, can_approve_overtime, can_approve_expense)
SELECT 
    id, 
    true, false, false, false,
    'Internal', 'Team',
    false, false, false
FROM organization_system_roles WHERE code = 'STAFF'
ON CONFLICT (role_id) DO NOTHING;

-- 5. Seed Initial Position to Role Mappings (Editable in Access Control)
DO $$
DECLARE
    v_role_id UUID;
BEGIN
    -- Superadmin / Tech / IT often map to SUPERADMIN or ADMIN
    SELECT id INTO v_role_id FROM organization_system_roles WHERE code = 'SUPERADMIN';
    UPDATE organization_positions SET system_role_id = v_role_id WHERE code IN ('IT');

    -- PMs and Lead roles often map to SUPERVISOR
    SELECT id INTO v_role_id FROM organization_system_roles WHERE code = 'SUPERVISOR';
    UPDATE organization_positions SET system_role_id = v_role_id WHERE code IN ('PM', 'SM');

    -- HC/FI map to HR/FINANCE
    SELECT id INTO v_role_id FROM organization_system_roles WHERE code = 'HR';
    UPDATE organization_positions SET system_role_id = v_role_id WHERE code IN ('HC');
    
    SELECT id INTO v_role_id FROM organization_system_roles WHERE code = 'FINANCE';
    UPDATE organization_positions SET system_role_id = v_role_id WHERE code IN ('FI');

    -- Others map to STAFF by default
    SELECT id INTO v_role_id FROM organization_system_roles WHERE code = 'STAFF';
    UPDATE organization_positions SET system_role_id = v_role_id WHERE system_role_id IS NULL;
END $$;

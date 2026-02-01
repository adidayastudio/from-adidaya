-- FINAL MASTER FIX v3: Safe-Fail Strategic RLS Restoration
-- This script performs a total policy reset and ONLY restores policies for EXISTING tables.
-- Run this in your Supabase SQL Editor.

BEGIN;

-- =========================================================================
-- 1. NUCLEAR CLEANUP: DROP ALL PUBLIC POLICIES
-- =========================================================================
DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    -- Drop is_manager with CASCADE first
    DROP FUNCTION IF EXISTS is_manager(text) CASCADE;
    DROP FUNCTION IF EXISTS is_manager() CASCADE;

    FOR pol IN 
        SELECT p.policyname, p.tablename 
        FROM pg_policies p
        WHERE p.schemaname = 'public'
    LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP; 
END $$;

-- =========================================================================
-- 2. SCHEMA TRANSFORMATION
-- =========================================================================

-- Upgrade column type
ALTER TABLE user_roles ALTER COLUMN role TYPE TEXT;

-- Standardize unique constraint to allow clean UPSERT from UI
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_key;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);

-- =========================================================================
-- 3. RECREATE DYNAMIC is_manager() FUNCTION
-- =========================================================================
CREATE OR REPLACE FUNCTION is_manager(capability_column TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_permission BOOLEAN;
BEGIN
    -- Global Admin/Superadmin check
    IF capability_column IS NULL THEN
        RETURN EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND UPPER(role) IN ('ADMIN', 'SUPERADMIN')
        );
    END IF;

    -- Dynamic Capability Check (Syncs with UI Toggles)
    -- This join is robust even if some roles aren't mapped yet
    EXECUTE format('
        SELECT EXISTS (
            SELECT 1 
            FROM user_roles ur
            JOIN organization_system_roles osr ON UPPER(ur.role) = UPPER(osr.code)
            JOIN organization_role_permissions orp ON osr.id = orp.role_id
            WHERE ur.user_id = auth.uid()
            AND orp.%I = true
        )', capability_column)
    INTO v_has_permission;

    RETURN COALESCE(v_has_permission, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 4. SAFE RESTORATION: CREATE POLICIES ONLY FOR EXISTING TABLES
-- =========================================================================
-- This block ensures the script never fails even if some migrations haven't run yet.
DO $$ 
BEGIN 
    -- Helper to create policy if table exists
    -- Usage: PERFORM create_safe_policy('tablename', 'policy_sql')

    -- --- 4.1 PEOPLE & CAREER ---
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        CREATE POLICY "Public profiles select" ON profiles FOR SELECT TO authenticated USING (true);
        CREATE POLICY "Admins manage profiles" ON profiles FOR UPDATE TO authenticated USING (is_manager('can_manage_people'));
        CREATE POLICY "Users update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_roles') THEN
        CREATE POLICY "Allow read all roles" ON user_roles FOR SELECT TO authenticated USING (true);
        CREATE POLICY "Admins manage roles" ON user_roles FOR ALL TO authenticated USING (is_manager());
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_documents') THEN
        CREATE POLICY "Admins manage documents" ON user_documents FOR ALL TO authenticated USING (is_manager('can_manage_people'));
        CREATE POLICY "Users manage own documents" ON user_documents FOR ALL TO authenticated USING (auth.uid() = user_id);
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'career_history') THEN
        CREATE POLICY "Manage Career History" ON career_history FOR ALL TO authenticated USING (is_manager('can_manage_people'));
        CREATE POLICY "View Career History" ON career_history FOR SELECT TO authenticated USING (true);
    END IF;

    -- --- 4.2 CLOCK & ATTENDANCE ---
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'leave_requests') THEN
        CREATE POLICY "Users manage own leave" ON leave_requests FOR ALL TO authenticated USING (auth.uid() = user_id);
        CREATE POLICY "Managers manage leave" ON leave_requests FOR ALL TO authenticated USING (is_manager('can_approve_leave'));
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'overtime_logs') THEN
        CREATE POLICY "Users manage own overtime" ON overtime_logs FOR ALL TO authenticated USING (auth.uid() = user_id);
        CREATE POLICY "Managers manage overtime" ON overtime_logs FOR ALL TO authenticated USING (is_manager('can_approve_overtime'));
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'business_trips') THEN
        CREATE POLICY "Users manage own trips" ON business_trips FOR ALL TO authenticated USING (auth.uid() = user_id);
        CREATE POLICY "Managers manage trips" ON business_trips FOR ALL TO authenticated USING (is_manager('can_approve_leave'));
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attendance_records') THEN
        CREATE POLICY "Attendance all access" ON attendance_records FOR ALL TO authenticated USING (auth.uid() = user_id OR is_manager('can_view_directory'));
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attendance_logs') THEN
        CREATE POLICY "Attendance logs access" ON attendance_logs FOR ALL TO authenticated USING (auth.uid() = user_id OR is_manager('can_view_directory'));
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attendance_sessions') THEN
        CREATE POLICY "Attendance sessions access" ON attendance_sessions FOR ALL TO authenticated USING (auth.uid() = user_id OR is_manager('can_view_directory'));
    END IF;

    -- --- 4.3 PROJECTS & CREW ---
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'projects') THEN
        CREATE POLICY "Anyone view projects" ON projects FOR SELECT TO authenticated USING (true);
        CREATE POLICY "Users manage projects" ON projects FOR ALL TO authenticated USING (true);
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'crew_members') THEN
        CREATE POLICY "Crew members access" ON crew_members FOR ALL TO authenticated USING (true);
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'crew_project_history') THEN
        CREATE POLICY "Crew history access" ON crew_project_history FOR ALL TO authenticated USING (true);
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'crew_requests') THEN
        CREATE POLICY "Crew requests access" ON crew_requests FOR ALL TO authenticated USING (true);
    END IF;

    -- --- 4.4 FINANCE, PURCHASING & REIMBURSEMENT ---
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_expenses') THEN
        CREATE POLICY "Managers manage expenses" ON project_expenses FOR ALL TO authenticated USING (is_manager('can_approve_expense'));
        CREATE POLICY "Users manage own expenses" ON project_expenses FOR ALL TO authenticated USING (auth.uid() = user_id);
        CREATE POLICY "Public view expenses" ON project_expenses FOR SELECT TO authenticated USING (true);
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'purchasing_requests') THEN
        CREATE POLICY "Purchasing access" ON purchasing_requests FOR ALL TO authenticated USING (true);
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reimbursement_requests') THEN
        CREATE POLICY "Reimbursement access" ON reimbursement_requests FOR ALL TO authenticated USING (true);
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'finance_beneficiary_accounts') THEN
        CREATE POLICY "Beneficiary accounts access" ON finance_beneficiary_accounts FOR ALL TO authenticated 
        USING (is_global = true OR created_by = auth.uid());
    END IF;

    -- --- 4.5 SYSTEM, NOTIFICATIONS & PUSH ---
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
        CREATE POLICY "Users notifications access" ON notifications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (true);
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'push_subscriptions') THEN
        CREATE POLICY "Users push access" ON push_subscriptions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;

    -- --- 4.6 ORGANIZATION SETUP ---
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'organization_system_roles') THEN
        CREATE POLICY "Org Roles access" ON organization_system_roles FOR ALL USING (true);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'organization_role_permissions') THEN
        CREATE POLICY "Org Permissions access" ON organization_role_permissions FOR ALL USING (true);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'employment_types') THEN
        CREATE POLICY "Employment Types access" ON employment_types FOR ALL USING (true);
    END IF;

    -- --- 4.7 INCENTIVE TABLES (SAFE CHECK) ---
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_incentive_pools') THEN
        CREATE POLICY "Incentive system access" ON project_incentive_pools FOR ALL TO authenticated USING (true);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_incentive_participants') THEN
        CREATE POLICY "Incentive participants access" ON project_incentive_participants FOR ALL TO authenticated USING (true);
    END IF;

END $$;

COMMIT;

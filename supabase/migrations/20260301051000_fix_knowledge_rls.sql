-- Migration: Refine Knowledge Items RLS Policies
-- Date: 2026-03-01
-- Description: Allow full CRUD only for privileged roles (Admin, Manager, Supervisor, HR, etc.)

-- First, drop existing refined policies to start clean
DROP POLICY IF EXISTS "Anyone can view knowledge items" ON knowledge_items;
DROP POLICY IF EXISTS "Users can create their own knowledge items" ON knowledge_items;
DROP POLICY IF EXISTS "Users can update their own knowledge items" ON knowledge_items;
DROP POLICY IF EXISTS "Users can delete their own knowledge items" ON knowledge_items;
DROP POLICY IF EXISTS "Managers can manage all knowledge items" ON knowledge_items;

-- 1. Anyone (Staff, Managers, Admins) can VIEW (Select) knowledge items
CREATE POLICY "Anyone can view knowledge items"
    ON knowledge_items FOR SELECT
    TO authenticated
    USING (true);

-- 2. PRIVILEGED USERS ONLY: Full CRUD (INSERT, UPDATE, DELETE)
-- Roles: admin, superadmin, supervisor, manager, hr, pm, owner
-- Note: Checking against the user_roles table
CREATE POLICY "Privileged users can manage knowledge items"
    ON knowledge_items FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role::text IN ('admin', 'superadmin', 'supervisor', 'manager', 'hr', 'pm', 'owner', 'administrator', 'management')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role::text IN ('admin', 'superadmin', 'supervisor', 'manager', 'hr', 'pm', 'owner', 'administrator', 'management')
        )
    );

-- 3. STAFF (Implicitly blocked from non-Select operations because they aren't in the above policy)
-- But let's be explicit about personal updates if allowed? 
-- The user said: "kalau staff itu cuma bisa baca/preview/download" 
-- implying they CANNOT create their own either.

-- If a user is both a staff and has another role (unlikely but possible), the "privileged" policy takes precedence.

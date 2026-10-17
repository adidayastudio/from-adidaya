-- Migration: Organization System Roles
-- Date: 2026-02-05
-- Description: Table for managing system-wide roles.

CREATE TABLE IF NOT EXISTS organization_system_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE, -- e.g., 'SUPERADMIN'
    name TEXT NOT NULL,         -- e.g., 'Superadmin'
    description TEXT,
    order_index INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Archived')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE organization_system_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View System Roles" ON organization_system_roles;
CREATE POLICY "View System Roles" ON organization_system_roles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Manage System Roles" ON organization_system_roles;
CREATE POLICY "Manage System Roles" ON organization_system_roles FOR ALL USING (auth.role() = 'authenticated');

-- Seed initial roles
INSERT INTO organization_system_roles (code, name, order_index) VALUES
('SUPERADMIN', 'Superadmin', 0),
('ADMIN', 'Admin', 1),
('MANAGER', 'Manager', 2),
('SUPERVISOR', 'Supervisor', 3),
('OWNER', 'Owner', 4),
('FINANCE', 'Finance', 5),
('HR', 'HR', 6),
('STAFF', 'Staff', 7),
('INTERN', 'Intern', 8)
ON CONFLICT (code) DO NOTHING;

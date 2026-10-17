-- Migration: Data Control Governance Setup
-- Date: 2026-02-10
-- Description: Governance layer for configuration safety and data lifecycle.

-- 1. Create Data Control Settings Table (Locks)
CREATE TABLE IF NOT EXISTS data_control_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain TEXT NOT NULL, -- 'People', 'Access'
    sub_domain TEXT NOT NULL, -- 'Roles', 'Departments', 'Levels', 'Skills', 'System Roles', etc.
    is_locked BOOLEAN DEFAULT false,
    locked_by UUID REFERENCES auth.users(id),
    locked_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(domain, sub_domain)
);

-- 2. Create Governance Audit Log Table
CREATE TABLE IF NOT EXISTS governance_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL, -- 'Lock', 'Unlock', 'Archive', 'Restore', 'Permanent Delete', 'Update'
    domain TEXT NOT NULL,
    sub_domain TEXT NOT NULL,
    entity_id UUID, -- If applicable (e.g., for Archive/Restore)
    entity_name TEXT,
    actor_id UUID REFERENCES auth.users(id),
    actor_name TEXT,
    previous_value JSONB,
    new_value JSONB,
    is_payroll_impact BOOLEAN DEFAULT false,
    is_security_impact BOOLEAN DEFAULT false,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- 3. RLS
ALTER TABLE data_control_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View Data Control Settings" ON data_control_settings;
CREATE POLICY "View Data Control Settings" ON data_control_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manage Data Control Settings" ON data_control_settings;
CREATE POLICY "Manage Data Control Settings" ON data_control_settings FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "View Governance Audit Log" ON governance_audit_log;
CREATE POLICY "View Governance Audit Log" ON governance_audit_log FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insert Governance Audit Log" ON governance_audit_log;
CREATE POLICY "Insert Governance Audit Log" ON governance_audit_log FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 4. Initial Seed for Governed Domains
INSERT INTO data_control_settings (domain, sub_domain, is_locked) VALUES
('People', 'Roles', false),
('People', 'Departments', false),
('People', 'Levels & Grades', false),
('People', 'Skills', false),
('Access', 'System Roles', false),
('Access', 'Capabilities', false),
('Access', 'Data Visibility', false),
('Access', 'Approval Authority', false)
ON CONFLICT (domain, sub_domain) DO NOTHING;

-- 5. Helper Function to Record Governance Events
CREATE OR REPLACE FUNCTION record_governance_event(
    p_action TEXT,
    p_domain TEXT,
    p_sub_domain TEXT,
    p_entity_id UUID DEFAULT NULL,
    p_entity_name TEXT DEFAULT NULL,
    p_previous_value JSONB DEFAULT NULL,
    p_new_value JSONB DEFAULT NULL,
    p_is_payroll_impact BOOLEAN DEFAULT false,
    p_is_security_impact BOOLEAN DEFAULT false
) RETURNS VOID AS $$
DECLARE
    v_actor_name TEXT;
BEGIN
    SELECT name INTO v_actor_name FROM profiles WHERE id = auth.uid();
    
    INSERT INTO governance_audit_log (
        action, domain, sub_domain, entity_id, entity_name, 
        actor_id, actor_name, previous_value, new_value, 
        is_payroll_impact, is_security_impact
    ) VALUES (
        p_action, p_domain, p_sub_domain, p_entity_id, p_entity_name, 
        auth.uid(), v_actor_name, p_previous_value, p_new_value, 
        p_is_payroll_impact, p_is_security_impact
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

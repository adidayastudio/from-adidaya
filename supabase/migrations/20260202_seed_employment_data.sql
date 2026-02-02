-- Migration: Seed Employment Setup Data
-- Date: 2026-02-02
-- Description: Ensures work_status and work_schedules have data and RLS allows access

-- =====================================================
-- PART 1: Fix RLS for work_status (allow anon for now to debug)
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "View Work Status" ON work_status;
DROP POLICY IF EXISTS "Manage Work Status" ON work_status;

-- Create more permissive policies
CREATE POLICY "View Work Status" ON work_status 
FOR SELECT USING (true);

CREATE POLICY "Manage Work Status" ON work_status 
FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'supervisor', 'superadmin', 'hr'))
);

-- =====================================================
-- PART 2: Fix RLS for work_schedules
-- =====================================================

DROP POLICY IF EXISTS "View Work Schedules" ON work_schedules;
DROP POLICY IF EXISTS "Manage Work Schedules" ON work_schedules;

CREATE POLICY "View Work Schedules" ON work_schedules 
FOR SELECT USING (true);

CREATE POLICY "Manage Work Schedules" ON work_schedules 
FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'supervisor', 'superadmin', 'hr'))
);

-- =====================================================
-- PART 3: Seed work_status data
-- =====================================================

INSERT INTO work_status (name, color, visibility, order_index) VALUES
('Active', '#10B981', 'Public', 1),
('On Leave', '#F59E0B', 'Team Only', 2),
('Inactive', '#6B7280', 'Private', 3),
('Remote', '#3B82F6', 'Public', 4),
('Sick Leave', '#EF4444', 'Team Only', 5)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- PART 4: Seed work_schedules data
-- =====================================================

INSERT INTO work_schedules (name, type, start_time, end_time, break_duration_minutes, days_config) VALUES
(
    'Regular Office Hours',
    'Fixed',
    '09:00:00',
    '18:00:00',
    60,
    '{"working_days": ["Mon", "Tue", "Wed", "Thu", "Fri"]}'::jsonb
),
(
    'Flexible Schedule',
    'Flexible',
    '08:00:00',
    '17:00:00',
    60,
    '{"days_per_week": 5}'::jsonb
),
(
    'Part-Time Morning',
    'Fixed',
    '08:00:00',
    '12:00:00',
    0,
    '{"working_days": ["Mon", "Tue", "Wed", "Thu", "Fri"]}'::jsonb
),
(
    'Part-Time Afternoon',
    'Fixed',
    '13:00:00',
    '17:00:00',
    0,
    '{"working_days": ["Mon", "Tue", "Wed", "Thu", "Fri"]}'::jsonb
),
(
    'Shift Based',
    'Shift',
    '00:00:00',
    '00:00:00',
    60,
    '{"shifts": ["morning", "evening", "night"]}'::jsonb
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- PART 5: Also seed employment_types if missing
-- =====================================================

INSERT INTO employment_types (name, min_level_code, max_level_code, order_index, is_default) VALUES
('Full-Time', 2, 5, 1, TRUE),
('Contract', 2, 5, 2, FALSE),
('Probation', 1, 1, 3, FALSE),
('Internship', 0, 0, 4, FALSE),
('Freelance', 0, 0, 5, FALSE),
('Outsource', 0, 0, 6, FALSE)
ON CONFLICT (name) DO NOTHING;

-- Fix RLS for employment_types too
DROP POLICY IF EXISTS "View Employment Types" ON employment_types;
DROP POLICY IF EXISTS "Manage Employment Types" ON employment_types;

CREATE POLICY "View Employment Types" ON employment_types 
FOR SELECT USING (true);

CREATE POLICY "Manage Employment Types" ON employment_types 
FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'supervisor', 'superadmin', 'hr'))
);

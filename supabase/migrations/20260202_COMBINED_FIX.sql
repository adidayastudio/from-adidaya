-- =====================================================
-- COMBINED FIX: Employment Data & ID Generation
-- Date: 2026-02-02
-- Run this in Supabase Dashboard > SQL Editor
-- =====================================================

-- =====================================================
-- PART 1: Fix ID Generation Type Cast Error
-- =====================================================

CREATE OR REPLACE FUNCTION generate_id_number(
    p_level_code INTEGER DEFAULT 0,
    p_dept_cluster INTEGER DEFAULT 0,
    p_pos_category INTEGER DEFAULT 0,
    p_join_date DATE DEFAULT CURRENT_DATE,
    p_custom_sequence INTEGER DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
    v_year_suffix TEXT;
    v_sequence INTEGER;
    v_seq_str TEXT;
    v_id_number TEXT;
    v_exists BOOLEAN;
    v_level TEXT;
    v_dept TEXT;
    v_pos TEXT;
BEGIN
    IF p_level_code IS NULL OR p_level_code < 0 THEN p_level_code := 0;
    ELSIF p_level_code > 5 THEN p_level_code := 5; END IF;
    IF p_dept_cluster IS NULL OR p_dept_cluster < 0 THEN p_dept_cluster := 0;
    ELSIF p_dept_cluster > 9 THEN p_dept_cluster := 9; END IF;
    IF p_pos_category IS NULL OR p_pos_category < 0 THEN p_pos_category := 0;
    ELSIF p_pos_category > 9 THEN p_pos_category := 9; END IF;
    IF p_join_date IS NULL THEN p_join_date := CURRENT_DATE; END IF;
    
    v_level := p_level_code::TEXT;
    v_dept := p_dept_cluster::TEXT;
    v_pos := p_pos_category::TEXT;
    v_year_suffix := TO_CHAR(p_join_date, 'YY');
    
    IF p_custom_sequence IS NOT NULL THEN
        IF p_custom_sequence < 1 OR p_custom_sequence > 999 THEN
            RAISE EXCEPTION 'Custom sequence must be between 1 and 999';
        END IF;
        v_seq_str := LPAD(p_custom_sequence::TEXT, 3, '0');
        v_id_number := v_level || v_dept || v_pos || v_year_suffix || v_seq_str;
        SELECT EXISTS(SELECT 1 FROM profiles WHERE id_number = v_id_number) INTO v_exists;
        IF v_exists THEN RAISE EXCEPTION 'ID Number % already exists', v_id_number; END IF;
        v_sequence := p_custom_sequence;
    ELSE
        UPDATE employee_sequences SET last_sequence = last_sequence + 1 WHERE id = 1 RETURNING last_sequence INTO v_sequence;
    END IF;
    
    v_seq_str := LPAD(v_sequence::TEXT, 3, '0');
    v_id_number := v_level || v_dept || v_pos || v_year_suffix || v_seq_str;
    RETURN v_id_number;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_employee_ids_trigger_func() RETURNS TRIGGER AS $$
DECLARE
    v_level_code INTEGER;
    v_dept_cluster INTEGER;
    v_pos_category INTEGER;
    v_level_text TEXT;
    v_dept_text TEXT;
    v_pos_text TEXT;
BEGIN
    IF NEW.level_id IS NOT NULL THEN
        SELECT level_code INTO v_level_code FROM organization_levels WHERE id = NEW.level_id;
    END IF;
    IF NEW.department_id IS NOT NULL THEN
        SELECT cluster_code INTO v_dept_cluster FROM organization_departments WHERE id = NEW.department_id;
    END IF;
    IF NEW.position_id IS NOT NULL THEN
        SELECT category_code INTO v_pos_category FROM organization_positions WHERE id = NEW.position_id;
    END IF;
    
    v_level_code := COALESCE(v_level_code, 0);
    v_dept_cluster := COALESCE(v_dept_cluster, 0);
    v_pos_category := COALESCE(v_pos_category, 0);
    
    v_level_text := v_level_code::TEXT;
    v_dept_text := v_dept_cluster::TEXT;
    v_pos_text := v_pos_category::TEXT;
    
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (
        NEW.department_id IS DISTINCT FROM OLD.department_id OR
        NEW.position_id IS DISTINCT FROM OLD.position_id OR
        NEW.level_id IS DISTINCT FROM OLD.level_id OR
        NEW.join_date IS DISTINCT FROM OLD.join_date
    )) THEN
        IF NEW.id_number IS NOT NULL THEN
            DECLARE
                v_existing_seq INTEGER;
                v_year_suffix TEXT;
            BEGIN
                v_existing_seq := SUBSTRING(NEW.id_number FROM 6 FOR 3)::INTEGER;
                v_year_suffix := TO_CHAR(COALESCE(NEW.join_date, CURRENT_DATE), 'YY');
                NEW.id_number := v_level_text || v_dept_text || v_pos_text || v_year_suffix || LPAD(v_existing_seq::TEXT, 3, '0');
            END;
        END IF;
        NEW.id_code := calculate_id_code(NEW.id_number, NEW.department_id, NEW.position_id, NEW.level_id);
    ELSIF TG_OP = 'UPDATE' AND NEW.id_number IS NOT NULL AND NEW.id_code IS NULL THEN
        NEW.id_code := calculate_id_code(NEW.id_number, NEW.department_id, NEW.position_id, NEW.level_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 2: Fix RLS and Seed Employment Data
-- =====================================================

-- Work Status RLS
DROP POLICY IF EXISTS "View Work Status" ON work_status;
DROP POLICY IF EXISTS "Manage Work Status" ON work_status;
CREATE POLICY "View Work Status" ON work_status FOR SELECT USING (true);
CREATE POLICY "Manage Work Status" ON work_status FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'supervisor', 'superadmin', 'hr'))
);

-- Work Schedules RLS
DROP POLICY IF EXISTS "View Work Schedules" ON work_schedules;
DROP POLICY IF EXISTS "Manage Work Schedules" ON work_schedules;
CREATE POLICY "View Work Schedules" ON work_schedules FOR SELECT USING (true);
CREATE POLICY "Manage Work Schedules" ON work_schedules FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'supervisor', 'superadmin', 'hr'))
);

-- Employment Types RLS
DROP POLICY IF EXISTS "View Employment Types" ON employment_types;
DROP POLICY IF EXISTS "Manage Employment Types" ON employment_types;
CREATE POLICY "View Employment Types" ON employment_types FOR SELECT USING (true);
CREATE POLICY "Manage Employment Types" ON employment_types FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'supervisor', 'superadmin', 'hr'))
);

-- Seed Work Status
INSERT INTO work_status (name, color, visibility, order_index) VALUES
('Active', '#10B981', 'Public', 1),
('On Leave', '#F59E0B', 'Team Only', 2),
('Inactive', '#6B7280', 'Private', 3),
('Remote', '#3B82F6', 'Public', 4),
('Sick Leave', '#EF4444', 'Team Only', 5)
ON CONFLICT (name) DO NOTHING;

-- Seed Work Schedules
INSERT INTO work_schedules (name, type, start_time, end_time, break_duration_minutes, days_config) VALUES
('Regular Office Hours', 'Fixed', '09:00:00', '18:00:00', 60, '{"working_days": ["Mon", "Tue", "Wed", "Thu", "Fri"]}'::jsonb),
('Flexible Schedule', 'Flexible', '08:00:00', '17:00:00', 60, '{"days_per_week": 5}'::jsonb),
('Part-Time Morning', 'Fixed', '08:00:00', '12:00:00', 0, '{"working_days": ["Mon", "Tue", "Wed", "Thu", "Fri"]}'::jsonb),
('Part-Time Afternoon', 'Fixed', '13:00:00', '17:00:00', 0, '{"working_days": ["Mon", "Tue", "Wed", "Thu", "Fri"]}'::jsonb),
('Shift Based', 'Shift', '00:00:00', '00:00:00', 60, '{"shifts": ["morning", "evening", "night"]}'::jsonb)
ON CONFLICT DO NOTHING;

-- Seed Employment Types
INSERT INTO employment_types (name, min_level_code, max_level_code, order_index, is_default) VALUES
('Full-Time', 2, 5, 1, TRUE),
('Contract', 2, 5, 2, FALSE),
('Probation', 1, 1, 3, FALSE),
('Internship', 0, 0, 4, FALSE),
('Freelance', 0, 0, 5, FALSE),
('Outsource', 0, 0, 6, FALSE)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- PART 3: Backfill Employee IDs
-- =====================================================

CREATE OR REPLACE FUNCTION backfill_employee_ids() RETURNS void AS $$
DECLARE
    rec RECORD;
    v_level_code INTEGER;
    v_dept_cluster INTEGER;
    v_pos_category INTEGER;
    v_year_suffix TEXT;
    v_sequence TEXT;
    v_id_number TEXT;
    v_id_code TEXT;
    v_roman TEXT;
    v_dept_code TEXT;
    v_pos_code TEXT;
    v_counter INTEGER := 0;
BEGIN
    FOR rec IN 
        SELECT p.id, p.level_id, p.department_id, p.position_id, p.join_date, p.id_number
        FROM profiles p
        ORDER BY p.created_at ASC
    LOOP
        v_counter := v_counter + 1;
        
        -- Get level code
        v_level_code := 0;
        IF rec.level_id IS NOT NULL THEN
            SELECT level_code INTO v_level_code FROM organization_levels WHERE id = rec.level_id;
        END IF;
        v_level_code := COALESCE(v_level_code, 0);
        
        -- Get department cluster
        v_dept_cluster := 0;
        IF rec.department_id IS NOT NULL THEN
            SELECT cluster_code INTO v_dept_cluster FROM organization_departments WHERE id = rec.department_id;
        END IF;
        v_dept_cluster := COALESCE(v_dept_cluster, 0);
        
        -- Get position category
        v_pos_category := 0;
        IF rec.position_id IS NOT NULL THEN
            SELECT category_code INTO v_pos_category FROM organization_positions WHERE id = rec.position_id;
        END IF;
        v_pos_category := COALESCE(v_pos_category, 0);
        
        -- Year from join date
        v_year_suffix := TO_CHAR(COALESCE(rec.join_date, CURRENT_DATE), 'YY');
        
        -- Sequence
        IF rec.id_number IS NOT NULL AND LENGTH(rec.id_number) >= 8 THEN
            v_sequence := SUBSTRING(rec.id_number FROM 6 FOR 3);
        ELSE
            v_sequence := LPAD(v_counter::TEXT, 3, '0');
        END IF;
        
        -- Generate ID Number
        v_id_number := v_level_code::TEXT || v_dept_cluster::TEXT || v_pos_category::TEXT || v_year_suffix || v_sequence;
        
        -- Get codes for ID Code
        v_roman := '0';
        IF rec.level_id IS NOT NULL THEN
            SELECT roman_code INTO v_roman FROM organization_levels WHERE id = rec.level_id;
        END IF;
        v_roman := COALESCE(v_roman, '0');
        
        v_dept_code := '';
        IF rec.department_id IS NOT NULL THEN
            SELECT SPLIT_PART(code, '-', 2) INTO v_dept_code FROM organization_departments WHERE id = rec.department_id;
        END IF;
        v_dept_code := COALESCE(v_dept_code, '');
        
        v_pos_code := '';
        IF rec.position_id IS NOT NULL THEN
            SELECT code INTO v_pos_code FROM organization_positions WHERE id = rec.position_id;
        END IF;
        v_pos_code := COALESCE(v_pos_code, '');
        
        -- Build ID Code
        IF v_dept_code = '' AND v_pos_code = '' THEN
            v_id_code := 'ADY-' || v_roman || '-STAFF-' || '20' || v_year_suffix || v_sequence;
        ELSE
            v_id_code := 'ADY-' || v_roman || '-' || v_dept_code || v_pos_code || '-' || '20' || v_year_suffix || v_sequence;
        END IF;
        
        -- Update profile (bypass trigger by setting both fields)
        UPDATE profiles 
        SET id_number = v_id_number, id_code = v_id_code
        WHERE id = rec.id;
    END LOOP;
    
    RAISE NOTICE 'Backfilled % profiles', v_counter;
END;
$$ LANGUAGE plpgsql;

-- Run backfill
SELECT backfill_employee_ids();

-- Cleanup
DROP FUNCTION IF EXISTS backfill_employee_ids();

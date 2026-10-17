-- Migration: Backfill Employee IDs
-- Date: 2026-02-02
-- Description: Generate proper id_number and id_code for all existing profiles

-- =====================================================
-- This migration runs AFTER the type cast fix is applied.
-- It regenerates IDs for all profiles based on their current data.
-- =====================================================

-- First, let's create a simple backfill function
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
    -- Loop through all profiles
    FOR rec IN 
        SELECT p.id, p.level_id, p.department_id, p.position_id, p.join_date, p.id_number
        FROM profiles p
        ORDER BY p.created_at ASC
    LOOP
        v_counter := v_counter + 1;
        
        -- Get level code
        IF rec.level_id IS NOT NULL THEN
            SELECT level_code INTO v_level_code 
            FROM organization_levels 
            WHERE id = rec.level_id;
        END IF;
        v_level_code := COALESCE(v_level_code, 0);
        
        -- Get department cluster
        IF rec.department_id IS NOT NULL THEN
            SELECT cluster_code INTO v_dept_cluster 
            FROM organization_departments 
            WHERE id = rec.department_id;
        END IF;
        v_dept_cluster := COALESCE(v_dept_cluster, 0);
        
        -- Get position category
        IF rec.position_id IS NOT NULL THEN
            SELECT category_code INTO v_pos_category 
            FROM organization_positions 
            WHERE id = rec.position_id;
        END IF;
        v_pos_category := COALESCE(v_pos_category, 0);
        
        -- Year from join date
        v_year_suffix := TO_CHAR(COALESCE(rec.join_date, CURRENT_DATE), 'YY');
        
        -- Sequence (use existing last 3 digits or counter)
        IF rec.id_number IS NOT NULL AND LENGTH(rec.id_number) >= 8 THEN
            v_sequence := SUBSTRING(rec.id_number FROM 6 FOR 3);
        ELSE
            v_sequence := LPAD(v_counter::TEXT, 3, '0');
        END IF;
        
        -- Generate ID Number using TEXT concatenation
        v_id_number := v_level_code::TEXT || v_dept_cluster::TEXT || v_pos_category::TEXT || v_year_suffix || v_sequence;
        
        -- Generate ID Code
        -- Get roman numeral
        SELECT roman_code INTO v_roman FROM organization_levels WHERE id = rec.level_id;
        v_roman := COALESCE(v_roman, '0');
        
        -- Get dept abbreviation
        SELECT SPLIT_PART(code, '-', 2) INTO v_dept_code FROM organization_departments WHERE id = rec.department_id;
        v_dept_code := COALESCE(v_dept_code, '');
        
        -- Get position code
        SELECT code INTO v_pos_code FROM organization_positions WHERE id = rec.position_id;
        v_pos_code := COALESCE(v_pos_code, '');
        
        -- Build ID Code
        IF v_dept_code = '' AND v_pos_code = '' THEN
            v_id_code := 'ADY-' || v_roman || '-STAFF-' || '20' || v_year_suffix || v_sequence;
        ELSE
            v_id_code := 'ADY-' || v_roman || '-' || v_dept_code || v_pos_code || '-' || '20' || v_year_suffix || v_sequence;
        END IF;
        
        -- Update the profile
        UPDATE profiles 
        SET id_number = v_id_number, 
            id_code = v_id_code
        WHERE id = rec.id;
        
        RAISE NOTICE 'Updated profile %: % / %', rec.id, v_id_number, v_id_code;
    END LOOP;
    
    RAISE NOTICE 'Backfilled % profiles', v_counter;
END;
$$ LANGUAGE plpgsql;

-- Execute the backfill
SELECT backfill_employee_ids();

-- Cleanup
DROP FUNCTION IF EXISTS backfill_employee_ids();

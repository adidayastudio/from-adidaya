-- Migration: Revamp Employee Identification System
-- Date: 2026-02-01
-- Description: Rename system_id/display_id to id_number/id_code, update generation functions

-- =====================================================
-- PART 1: Rename Columns
-- =====================================================

-- Rename system_id to id_number
ALTER TABLE profiles RENAME COLUMN system_id TO id_number;

-- Rename display_id to id_code  
ALTER TABLE profiles RENAME COLUMN display_id TO id_code;

-- Update index name
DROP INDEX IF EXISTS idx_profiles_system_id;
CREATE INDEX IF NOT EXISTS idx_profiles_id_number ON profiles(id_number);

-- =====================================================
-- PART 2: Update ID Number Generation Function
-- =====================================================

-- Drop old function
DROP FUNCTION IF EXISTS generate_system_id(INTEGER, INTEGER, INTEGER, DATE);

-- New function: Generate ID Number
-- Format: [LEVEL][DEPT][POS][YY][SEQ]
-- Allows optional sequence parameter for manual selection
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
BEGIN
    -- Validate level code (0-5, default 0)
    IF p_level_code IS NULL OR p_level_code < 0 THEN
        p_level_code := 0;
    ELSIF p_level_code > 5 THEN
        p_level_code := 5;
    END IF;
    
    -- Validate department cluster (0-9, default 0)
    IF p_dept_cluster IS NULL OR p_dept_cluster < 0 THEN
        p_dept_cluster := 0;
    ELSIF p_dept_cluster > 9 THEN
        p_dept_cluster := 9;
    END IF;
    
    -- Validate position category (0-9, default 0)
    IF p_pos_category IS NULL OR p_pos_category < 0 THEN
        p_pos_category := 0;
    ELSIF p_pos_category > 9 THEN
        p_pos_category := 9;
    END IF;
    
    -- Handle null join date
    IF p_join_date IS NULL THEN
        p_join_date := CURRENT_DATE;
    END IF;
    
    -- Digit 4-5: Year suffix
    v_year_suffix := TO_CHAR(p_join_date, 'YY');
    
    -- Digit 6-8: Sequence number
    IF p_custom_sequence IS NOT NULL THEN
        -- Validate custom sequence is within range
        IF p_custom_sequence < 1 OR p_custom_sequence > 999 THEN
            RAISE EXCEPTION 'Custom sequence must be between 1 and 999';
        END IF;
        
        -- Check if custom sequence already exists
        v_seq_str := LPAD(p_custom_sequence::TEXT, 3, '0');
        v_id_number := p_level_code || p_dept_cluster || p_pos_category || v_year_suffix || v_seq_str;
        
        SELECT EXISTS(SELECT 1 FROM profiles WHERE id_number = v_id_number) INTO v_exists;
        IF v_exists THEN
            RAISE EXCEPTION 'ID Number % already exists', v_id_number;
        END IF;
        
        v_sequence := p_custom_sequence;
    ELSE
        -- Auto-increment global sequence
        UPDATE employee_sequences 
        SET last_sequence = last_sequence + 1 
        WHERE id = 1 
        RETURNING last_sequence INTO v_sequence;
    END IF;
    
    v_seq_str := LPAD(v_sequence::TEXT, 3, '0');
    v_id_number := p_level_code || p_dept_cluster || p_pos_category || v_year_suffix || v_seq_str;
    
    RETURN v_id_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 3: Update ID Code Calculation Function
-- =====================================================

-- Drop old function
DROP FUNCTION IF EXISTS calculate_display_id(TEXT, UUID, UUID, UUID);

-- New function: Calculate ID Code (human-readable)
-- Format: ADY-[ROMAN]-[DEPT][POS]-[YEAR][SEQ]
CREATE OR REPLACE FUNCTION calculate_id_code(
    p_id_number TEXT,
    p_dept_id UUID,
    p_pos_id UUID,
    p_level_id UUID
) RETURNS TEXT AS $$
DECLARE
    v_dept_code TEXT;
    v_pos_code TEXT;
    v_level_roman TEXT;
    v_year TEXT;
    v_sequence TEXT;
    v_id_code TEXT;
BEGIN
    IF p_id_number IS NULL OR LENGTH(p_id_number) < 8 THEN
        RETURN NULL;
    END IF;

    -- Fetch department code (3-letter abbreviation from "X-ABC" format)
    SELECT SPLIT_PART(code, '-', 2) INTO v_dept_code 
    FROM organization_departments 
    WHERE id = p_dept_id;
    
    -- Fetch position code (2-letter)
    SELECT code INTO v_pos_code 
    FROM organization_positions 
    WHERE id = p_pos_id;
    
    -- Fetch level roman numeral
    SELECT roman_code INTO v_level_roman 
    FROM organization_levels 
    WHERE id = p_level_id;
    
    -- Apply defaults
    v_dept_code := COALESCE(v_dept_code, '');
    v_pos_code := COALESCE(v_pos_code, '');
    v_level_roman := COALESCE(v_level_roman, '0');
    
    -- Combined dept+pos code, default to STAFF if empty
    IF v_dept_code = '' AND v_pos_code = '' THEN
        v_dept_code := 'STAFF';
        v_pos_code := '';
    END IF;

    -- Extract from ID Number
    -- Format: [1][1][1][22][001] = 8 chars
    -- Digits 4-5 are index 4,5 (1-based)
    v_year := '20' || SUBSTRING(p_id_number FROM 4 FOR 2);
    v_sequence := SUBSTRING(p_id_number FROM 6 FOR 3);

    -- Format: ADY-[LEVEL]-[DEPT][POS]-[YEAR][SEQ]
    v_id_code := 'ADY-' || v_level_roman || '-' || v_dept_code || v_pos_code || '-' || v_year || v_sequence;

    RETURN v_id_code;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 4: Update Trigger Function
-- =====================================================

-- Drop old trigger
DROP TRIGGER IF EXISTS trg_update_display_id ON profiles;

-- New trigger function that regenerates both ID Number and ID Code
CREATE OR REPLACE FUNCTION update_employee_ids_trigger_func() RETURNS TRIGGER AS $$
DECLARE
    v_level_code INTEGER;
    v_dept_cluster INTEGER;
    v_pos_category INTEGER;
BEGIN
    -- Get codes from related tables
    IF NEW.level_id IS NOT NULL THEN
        SELECT level_code INTO v_level_code FROM organization_levels WHERE id = NEW.level_id;
    END IF;
    
    IF NEW.department_id IS NOT NULL THEN
        SELECT cluster_code INTO v_dept_cluster FROM organization_departments WHERE id = NEW.department_id;
    END IF;
    
    IF NEW.position_id IS NOT NULL THEN
        SELECT category_code INTO v_pos_category FROM organization_positions WHERE id = NEW.position_id;
    END IF;
    
    -- Apply defaults
    v_level_code := COALESCE(v_level_code, 0);
    v_dept_cluster := COALESCE(v_dept_cluster, 0);
    v_pos_category := COALESCE(v_pos_category, 0);
    
    -- Check if structure fields changed (requiring ID regeneration)
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (
        NEW.department_id IS DISTINCT FROM OLD.department_id OR
        NEW.position_id IS DISTINCT FROM OLD.position_id OR
        NEW.level_id IS DISTINCT FROM OLD.level_id OR
        NEW.join_date IS DISTINCT FROM OLD.join_date
    )) THEN
        -- Regenerate ID Number if structure changed and we have one already
        -- OR if this is an insert without an ID Number
        IF NEW.id_number IS NOT NULL THEN
            -- Extract existing sequence to preserve it
            DECLARE
                v_existing_seq INTEGER;
                v_year_suffix TEXT;
            BEGIN
                v_existing_seq := SUBSTRING(NEW.id_number FROM 6 FOR 3)::INTEGER;
                v_year_suffix := TO_CHAR(COALESCE(NEW.join_date, CURRENT_DATE), 'YY');
                
                -- Rebuild ID Number with same sequence but new structure codes
                NEW.id_number := v_level_code || v_dept_cluster || v_pos_category || v_year_suffix || LPAD(v_existing_seq::TEXT, 3, '0');
            END;
        END IF;
        
        -- Always recalculate ID Code
        NEW.id_code := calculate_id_code(
            NEW.id_number,
            NEW.department_id,
            NEW.position_id,
            NEW.level_id
        );
    ELSIF TG_OP = 'UPDATE' AND NEW.id_number IS NOT NULL AND NEW.id_code IS NULL THEN
        -- If ID Number exists but ID Code is missing, calculate it
        NEW.id_code := calculate_id_code(
            NEW.id_number,
            NEW.department_id,
            NEW.position_id,
            NEW.level_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger
CREATE TRIGGER trg_update_employee_ids
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_employee_ids_trigger_func();

-- =====================================================
-- PART 5: Helper function to check sequence availability
-- =====================================================

CREATE OR REPLACE FUNCTION is_sequence_available(
    p_sequence INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    IF p_sequence IS NULL OR p_sequence < 1 OR p_sequence > 999 THEN
        RETURN FALSE;
    END IF;
    
    -- Check if any ID Number uses this sequence (last 3 digits)
    SELECT EXISTS(
        SELECT 1 FROM profiles 
        WHERE SUBSTRING(id_number FROM 6 FOR 3) = LPAD(p_sequence::TEXT, 3, '0')
    ) INTO v_exists;
    
    RETURN NOT v_exists;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 6: Update existing data
-- =====================================================

-- Recalculate id_code for all existing profiles that have id_number
UPDATE profiles
SET id_code = calculate_id_code(id_number, department_id, position_id, level_id)
WHERE id_number IS NOT NULL;

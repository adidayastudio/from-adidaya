-- Migration: Fix ID Generation Type Cast Error
-- Date: 2026-02-02
-- Description: Fix "operator does not exist: integer || integer" error by casting integers to TEXT

-- =====================================================
-- PART 1: Fix generate_id_number Function
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
    
    -- Convert integers to text for concatenation
    v_level := p_level_code::TEXT;
    v_dept := p_dept_cluster::TEXT;
    v_pos := p_pos_category::TEXT;
    
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
        v_id_number := v_level || v_dept || v_pos || v_year_suffix || v_seq_str;
        
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
    v_id_number := v_level || v_dept || v_pos || v_year_suffix || v_seq_str;
    
    RETURN v_id_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 2: Fix Trigger Function
-- =====================================================

CREATE OR REPLACE FUNCTION update_employee_ids_trigger_func() RETURNS TRIGGER AS $$
DECLARE
    v_level_code INTEGER;
    v_dept_cluster INTEGER;
    v_pos_category INTEGER;
    v_level_text TEXT;
    v_dept_text TEXT;
    v_pos_text TEXT;
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
    
    -- Apply defaults and convert to text for concatenation
    v_level_code := COALESCE(v_level_code, 0);
    v_dept_cluster := COALESCE(v_dept_cluster, 0);
    v_pos_category := COALESCE(v_pos_category, 0);
    
    v_level_text := v_level_code::TEXT;
    v_dept_text := v_dept_cluster::TEXT;
    v_pos_text := v_pos_category::TEXT;
    
    -- Check if structure fields changed (requiring ID regeneration)
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (
        NEW.department_id IS DISTINCT FROM OLD.department_id OR
        NEW.position_id IS DISTINCT FROM OLD.position_id OR
        NEW.level_id IS DISTINCT FROM OLD.level_id OR
        NEW.join_date IS DISTINCT FROM OLD.join_date
    )) THEN
        -- Regenerate ID Number if structure changed and we have one already
        IF NEW.id_number IS NOT NULL THEN
            -- Extract existing sequence to preserve it
            DECLARE
                v_existing_seq INTEGER;
                v_year_suffix TEXT;
            BEGIN
                v_existing_seq := SUBSTRING(NEW.id_number FROM 6 FOR 3)::INTEGER;
                v_year_suffix := TO_CHAR(COALESCE(NEW.join_date, CURRENT_DATE), 'YY');
                
                -- Rebuild ID Number with same sequence but new structure codes (using TEXT concatenation)
                NEW.id_number := v_level_text || v_dept_text || v_pos_text || v_year_suffix || LPAD(v_existing_seq::TEXT, 3, '0');
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

-- Note: The trigger itself (trg_update_employee_ids) doesn't need to be recreated
-- since we're just updating the function it calls.

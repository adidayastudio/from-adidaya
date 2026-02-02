-- Migration: Sync ID Code Trigger
-- Date: 2026-02-02
-- Description: Automatically regenerate id_code when id_number, level, department, or position changes.

CREATE OR REPLACE FUNCTION sync_id_code_on_change() RETURNS TRIGGER AS $$
DECLARE
    v_roman TEXT;
    v_dept_code TEXT;
    v_pos_code TEXT;
    v_sequence TEXT;
    v_year_suffix TEXT;
BEGIN
    -- Only run if relevant fields changed
    IF NEW.id_number IS DISTINCT FROM OLD.id_number OR
       NEW.level_id IS DISTINCT FROM OLD.level_id OR
       NEW.department_id IS DISTINCT FROM OLD.department_id OR
       NEW.position_id IS DISTINCT FROM OLD.position_id 
    THEN
        -- 1. Extract Sequence from ID Number (last 3 digits)
        -- Assuming id_number format is correct (8 digits or more)
        IF NEW.id_number IS NOT NULL AND LENGTH(NEW.id_number) >= 3 THEN
            v_sequence := SUBSTRING(NEW.id_number FROM LENGTH(NEW.id_number) - 2 FOR 3);
        ELSE
            v_sequence := '000';
        END IF;

        -- 2. Extract Year Suffix from Join Date (or fallback to current year if null, but try to use existing)
        -- We'll try to keep the year from the existing id_code if possible, or derive from join_date
        -- Actually, consistent with backfill, let's use join_date
        v_year_suffix := TO_CHAR(COALESCE(NEW.join_date, CURRENT_DATE), 'YY');

        -- 3. Get Roman Code (Level)
        SELECT roman_code INTO v_roman FROM organization_levels WHERE id = NEW.level_id;
        v_roman := COALESCE(v_roman, '0');

        -- 4. Get Department Code
        SELECT SPLIT_PART(code, '-', 2) INTO v_dept_code FROM organization_departments WHERE id = NEW.department_id;
        v_dept_code := COALESCE(v_dept_code, '');

        -- 5. Get Position Code
        SELECT code INTO v_pos_code FROM organization_positions WHERE id = NEW.position_id;
        v_pos_code := COALESCE(v_pos_code, '');

        -- 6. Construct ID Code
        -- Format: ADY-{ROMAN}-{DEPT}{POS}-20{YY}{SEQ}
        IF v_dept_code = '' AND v_pos_code = '' THEN
            NEW.id_code := 'ADY-' || v_roman || '-STAFF-' || '20' || v_year_suffix || v_sequence;
        ELSE
            NEW.id_code := 'ADY-' || v_roman || '-' || v_dept_code || v_pos_code || '-' || '20' || v_year_suffix || v_sequence;
        END IF;
        
        -- Debug or Metadata update logic could go here
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger definition
DROP TRIGGER IF EXISTS trigger_sync_id_code ON profiles;

CREATE TRIGGER trigger_sync_id_code
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION sync_id_code_on_change();

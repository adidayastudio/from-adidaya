-- COMPREHENSIVE DATABASE FIX v2
-- This script fixes "permission denied" and "ON CONFLICT matching constraint" errors.

-- 1. Hardening Helper Functions with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.calculate_id_code(
    p_id_number TEXT,
    p_dept_id UUID,
    p_pos_id UUID,
    p_level_id UUID
) RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
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

    SELECT SPLIT_PART(code, '-', 2) INTO v_dept_code FROM organization_departments WHERE id = p_dept_id;
    SELECT code INTO v_pos_code FROM organization_positions WHERE id = p_pos_id;
    SELECT roman_code INTO v_level_roman FROM organization_levels WHERE id = p_level_id;
    
    v_dept_code := COALESCE(v_dept_code, '');
    v_pos_code := COALESCE(v_pos_code, '');
    v_level_roman := COALESCE(v_level_roman, '0');
    
    IF v_dept_code = '' AND v_pos_code = '' THEN
        v_dept_code := 'STAFF';
        v_pos_code := '';
    END IF;

    v_year := '20' || SUBSTRING(p_id_number FROM 4 FOR 2);
    v_sequence := SUBSTRING(p_id_number FROM 6 FOR 3);
    v_id_code := 'ADY-' || v_level_roman || '-' || v_dept_code || v_pos_code || '-' || v_year || v_sequence;

    RETURN v_id_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_display_id(
    p_system_id TEXT,
    p_dept_id UUID,
    p_pos_id UUID,
    p_level_id UUID
) RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    v_dept_code TEXT;
    v_pos_code TEXT;
    v_level_roman TEXT;
    v_year TEXT;
    v_sequence TEXT;
    v_display_id TEXT;
BEGIN
    IF p_system_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT SPLIT_PART(code, '-', 2) INTO v_dept_code FROM organization_departments WHERE id = p_dept_id;
    SELECT code INTO v_pos_code FROM organization_positions WHERE id = p_pos_id;
    SELECT roman_code INTO v_level_roman FROM organization_levels WHERE id = p_level_id;
    
    v_dept_code := COALESCE(v_dept_code, 'UNK');
    v_pos_code := COALESCE(v_pos_code, 'UNK');
    v_level_roman := COALESCE(v_level_roman, 'I');

    v_year := '20' || SUBSTRING(p_system_id FROM 4 FOR 2);
    v_sequence := SUBSTRING(p_system_id FROM 6 FOR 3);
    v_display_id := 'ADY-' || v_level_roman || '-' || v_dept_code || v_pos_code || '-' || v_year || v_sequence;

    RETURN v_display_id;
END;
$$;

-- 2. Master Trigger Function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles if not exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = new.id) THEN
    INSERT INTO public.profiles (id, username, full_name, avatar_url, email)
    VALUES (
      new.id,
      split_part(new.email, '@', 1),
      split_part(new.email, '@', 1),
      '',
      new.email
    );
  END IF;

  -- Insert into user_roles if not exists (using WHERE NOT EXISTS instead of ON CONFLICT to avoid constraint mismatch errors)
  INSERT INTO public.user_roles (user_id, role)
  SELECT new.id, 'staff'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = new.id AND role = 'staff'
  );

  RETURN new;
END;
$$;

-- 3. Profile ID Trigger Function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.update_employee_ids_trigger_func()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_level_code INTEGER;
    v_dept_cluster INTEGER;
    v_pos_category INTEGER;
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
    
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (
        NEW.department_id IS DISTINCT FROM OLD.department_id OR
        NEW.position_id IS DISTINCT FROM OLD.position_id OR
        NEW.level_id IS DISTINCT FROM OLD.level_id OR
        NEW.join_date IS DISTINCT FROM OLD.join_date
    )) THEN
        IF NEW.id_number IS NOT NULL AND LENGTH(NEW.id_number) >= 8 THEN
            DECLARE
                v_existing_seq INTEGER;
                v_year_suffix TEXT;
            BEGIN
                v_existing_seq := SUBSTRING(NEW.id_number FROM LENGTH(NEW.id_number) - 2 FOR 3)::INTEGER;
                v_year_suffix := TO_CHAR(COALESCE(NEW.join_date, CURRENT_DATE), 'YY');
                NEW.id_number := v_level_code::TEXT || v_dept_cluster::TEXT || v_pos_category::TEXT || v_year_suffix || LPAD(v_existing_seq::TEXT, 3, '0');
            END;
        END IF;
        NEW.id_code := calculate_id_code(NEW.id_number, NEW.department_id, NEW.position_id, NEW.level_id);
    ELSIF TG_OP = 'UPDATE' AND NEW.id_number IS NOT NULL AND NEW.id_code IS NULL THEN
        NEW.id_code := calculate_id_code(NEW.id_number, NEW.department_id, NEW.position_id, NEW.level_id);
    END IF;
    
    RETURN NEW;
END;
$$;

-- 4. Re-establish Triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

DROP TRIGGER IF EXISTS trg_update_employee_ids ON public.profiles;
CREATE TRIGGER trg_update_employee_ids
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_employee_ids_trigger_func();

-- 5. Grant Permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Create sequence for task numbers
CREATE SEQUENCE IF NOT EXISTS task_number_seq;

-- Add task_number column
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task_number VARCHAR;

-- Create trigger function
CREATE OR REPLACE FUNCTION set_task_number()
RETURNS TRIGGER AS $$
DECLARE
    p_code VARCHAR;
    w_code VARCHAR;
    seq_num VARCHAR;
BEGIN
    -- Get project number (e.g. 037)
    SELECT project_number INTO p_code FROM public.projects WHERE id = NEW.project_id;
    
    -- Get WBS code if exists (e.g. A.1)
    IF NEW.wbs_id IS NOT NULL THEN
        SELECT wbs_code INTO w_code FROM public.project_wbs_items WHERE id = NEW.wbs_id;
        -- Remove dot if any (e.g. A.1 -> A1)
        w_code := REPLACE(w_code, '.', '');
    END IF;

    -- Generate sequence number
    seq_num := LPAD(nextval('task_number_seq')::text, 5, '0');

    -- Format task_number (037-A1-00057 or 037-00057)
    IF w_code IS NOT NULL THEN
        NEW.task_number := COALESCE(p_code, '000') || '-' || w_code || '-' || seq_num;
    ELSE
        NEW.task_number := COALESCE(p_code, '000') || '-' || seq_num;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS tr_set_task_number ON public.tasks;
CREATE TRIGGER tr_set_task_number
BEFORE INSERT ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION set_task_number();

-- Retroactively add numbers to existing tasks
DO $$
DECLARE
    task_record RECORD;
    p_code VARCHAR;
    w_code VARCHAR;
BEGIN
    FOR task_record IN SELECT id, project_id, wbs_id FROM public.tasks
    LOOP
        -- Get project number
        SELECT project_number INTO p_code FROM public.projects WHERE id = task_record.project_id;
        
        -- Get WBS code
        IF task_record.wbs_id IS NOT NULL THEN
            SELECT wbs_code INTO w_code FROM public.project_wbs_items WHERE id = task_record.wbs_id;
            w_code := REPLACE(w_code, '.', '');
        ELSE
            w_code := NULL;
        END IF;

        -- Format
        IF w_code IS NOT NULL THEN
            UPDATE public.tasks 
            SET task_number = COALESCE(p_code, '000') || '-' || w_code || '-' || LPAD(nextval('task_number_seq')::text, 5, '0')
            WHERE id = task_record.id;
        ELSE
            UPDATE public.tasks 
            SET task_number = COALESCE(p_code, '000') || '-' || LPAD(nextval('task_number_seq')::text, 5, '0')
            WHERE id = task_record.id;
        END IF;
    END LOOP;
END;
$$;

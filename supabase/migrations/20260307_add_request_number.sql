-- Migration: Sequential Request Numbering for Finance
-- Date: 2026-03-07
-- Description: Adds request_number columns and triggers for PO/RE ID generation.

-- 1. Add columns to purchasing_requests
ALTER TABLE purchasing_requests ADD COLUMN IF NOT EXISTS request_number INTEGER;

-- 2. Add columns to reimbursement_requests
ALTER TABLE reimbursement_requests ADD COLUMN IF NOT EXISTS request_number INTEGER;

-- 3. Create function to assign request number
CREATE OR REPLACE FUNCTION assign_request_number() RETURNS TRIGGER AS $$
DECLARE
    v_last_number INTEGER;
    v_table_name TEXT;
BEGIN
    v_table_name := TG_TABLE_NAME;
    
    -- Only assign if request_number is null
    IF NEW.request_number IS NULL THEN
        -- Get the highest number for this project in the current table
        EXECUTE format('SELECT COALESCE(MAX(request_number), 0) FROM %I WHERE project_id = $1', v_table_name)
        INTO v_last_number
        USING NEW.project_id;
        
        NEW.request_number := v_last_number + 1;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create triggers
DROP TRIGGER IF EXISTS trg_assign_purchasing_number ON purchasing_requests;
CREATE TRIGGER trg_assign_purchasing_number
BEFORE INSERT ON purchasing_requests
FOR EACH ROW
EXECUTE FUNCTION assign_request_number();

DROP TRIGGER IF EXISTS trg_assign_reimburse_number ON reimbursement_requests;
CREATE TRIGGER trg_assign_reimburse_number
BEFORE INSERT ON reimbursement_requests
FOR EACH ROW
EXECUTE FUNCTION assign_request_number();

-- 5. Backfill existing records (optional but recommended for consistency)
-- This will assign numbers based on created_at order per project
DO $$
DECLARE
    r RECORD;
    v_count INTEGER;
BEGIN
    FOR r IN SELECT DISTINCT project_id FROM purchasing_requests LOOP
        v_count := 1;
        FOR r IN SELECT id FROM purchasing_requests WHERE project_id = r.project_id ORDER BY created_at ASC LOOP
            UPDATE purchasing_requests SET request_number = v_count WHERE id = r.id;
            v_count := v_count + 1;
        END LOOP;
    END LOOP;
    
    FOR r IN SELECT DISTINCT project_id FROM reimbursement_requests LOOP
        v_count := 1;
        FOR r IN SELECT id FROM reimbursement_requests WHERE project_id = r.project_id ORDER BY created_at ASC LOOP
            UPDATE reimbursement_requests SET request_number = v_count WHERE id = r.id;
            v_count := v_count + 1;
        END LOOP;
    END LOOP;
END $$;

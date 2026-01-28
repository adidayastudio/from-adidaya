-- FIX: Restore robust notification logic and ensure triggers exist for both Purchasing and Reimbursement
-- This fixes the regression where notifications were only sent to self (or not at all for Reimbursement)

CREATE OR REPLACE FUNCTION notify_purchasing_status_change()
RETURNS TRIGGER AS $$
DECLARE
    p_code TEXT;
    actor_name TEXT;
    action_text TEXT;
    target_user RECORD;
BEGIN
    -- Set search path for security
    PERFORM set_config('search_path', 'public', true);

    BEGIN
        -- Get Project Code
        SELECT project_code INTO p_code FROM projects WHERE id = NEW.project_id;
        -- Get Actor Name
        SELECT full_name INTO actor_name FROM profiles WHERE id = auth.uid();
        
        actor_name := COALESCE(actor_name, 'System');
        p_code := COALESCE(p_code, 'N/A');

        IF (TG_OP = 'INSERT') THEN
            -- IGNORE DRAFTS: Only notify if created as SUBMITTED (or other active state)
            IF NEW.approval_status = 'DRAFT' THEN
                RETURN NEW;
            END IF;

            -- NOTIFY: Admins, Supervisors, Finance (The Team, not just the Creator)
            FOR target_user IN 
                SELECT DISTINCT user_id 
                FROM user_roles 
                WHERE role IN ('admin', 'supervisor', 'finance') 
                AND user_id IS NOT NULL
            LOOP
                -- For testing/visibility: Allow notification to self if they have the role
                -- IF target_user.user_id != auth.uid() THEN
                    INSERT INTO notifications (user_id, type, category, title, description, link, metadata)
                    VALUES (
                        target_user.user_id, 
                        'info',
                        'finance',
                        'Purchasing • ' || p_code,
                        actor_name || ' submitted ' || NEW.description,
                        '/flow/finance/purchasing',
                        jsonb_build_object('requestId', NEW.id, 'projectId', NEW.project_id, 'actor', actor_name)
                    );
                -- END IF;
            END LOOP;
            
            RETURN NEW;
        END IF;

        IF (TG_OP = 'UPDATE') THEN
            -- Determine Action Text
            action_text := NULL;
            
            -- 1. Approval Status Changes
            IF (OLD.approval_status IS DISTINCT FROM NEW.approval_status) THEN
                action_text := CASE 
                    WHEN NEW.approval_status = 'APPROVED' THEN 'approved'
                    WHEN NEW.approval_status = 'REJECTED' THEN 'rejected'
                    ELSE LOWER(NEW.approval_status)
                END;
            -- 2. Financial Status Changes (Paid)
            ELSIF (OLD.financial_status IS DISTINCT FROM NEW.financial_status) AND (NEW.financial_status = 'PAID') THEN
                action_text := 'marking as paid:';
            -- 3. Stage Changes (Invoiced, Received)
            ELSIF (OLD.purchase_stage IS DISTINCT FROM NEW.purchase_stage) AND (NEW.purchase_stage IN ('INVOICED', 'RECEIVED')) THEN
                action_text := CASE 
                    WHEN NEW.purchase_stage = 'INVOICED' THEN 'uploaded invoice for'
                    WHEN NEW.purchase_stage = 'RECEIVED' THEN 'received goods for'
                    ELSE LOWER(NEW.purchase_stage)
                END;
            END IF;

            -- If an actionable change occurred, broadcast it
            IF action_text IS NOT NULL THEN
                -- RECIPIENTS: Creator + Admins + Supervisors + Finance
                FOR target_user IN 
                    SELECT DISTINCT user_id FROM (
                        SELECT user_id FROM user_roles WHERE role IN ('admin', 'supervisor', 'finance')
                        UNION
                        SELECT NEW.created_by as user_id
                    ) all_targets
                    WHERE user_id IS NOT NULL
                LOOP
                    -- IF target_user.user_id != auth.uid() THEN
                        INSERT INTO notifications (user_id, type, category, title, description, link, metadata)
                        VALUES (
                            target_user.user_id, 
                            'info', 
                            'finance',
                            'Purchasing • ' || p_code,
                            actor_name || ' ' || action_text || ' ' || NEW.description,
                            '/flow/finance/purchasing',
                            jsonb_build_object('requestId', NEW.id, 'projectId', NEW.project_id, 'actor', actor_name)
                        );
                    -- END IF;
                END LOOP;
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Notification Error: %', SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION notify_reimbursement_status_change()
RETURNS TRIGGER AS $$
DECLARE
    p_code TEXT;
    actor_name TEXT;
    action_text TEXT;
    target_user RECORD;
BEGIN
    -- Set search path
    PERFORM set_config('search_path', 'public', true);

    BEGIN
        -- Get Project Code
        SELECT project_code INTO p_code FROM projects WHERE id = NEW.project_id;
        -- Get Actor Name
        SELECT full_name INTO actor_name FROM profiles WHERE id = auth.uid();

        actor_name := COALESCE(actor_name, 'System');
        p_code := COALESCE(p_code, 'N/A');

        IF (TG_OP = 'INSERT') THEN
            -- NOTIFY: Admins, Supervisors, Finance
            FOR target_user IN 
                SELECT DISTINCT user_id 
                FROM user_roles 
                WHERE role IN ('admin', 'supervisor', 'finance') 
                AND user_id IS NOT NULL
            LOOP
                -- IF target_user.user_id != auth.uid() THEN
                    INSERT INTO notifications (user_id, type, category, title, description, link, metadata)
                    VALUES (
                        target_user.user_id, 
                        'info',
                        'finance',
                        'Reimbursement • ' || p_code,
                        actor_name || ' submitted ' || NEW.description,
                        '/flow/finance/reimburse',
                        jsonb_build_object('requestId', NEW.id, 'projectId', NEW.project_id, 'actor', actor_name)
                    );
                -- END IF;
            END LOOP;

            RETURN NEW;
        END IF;

        IF (TG_OP = 'UPDATE') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
             action_text := CASE 
                WHEN NEW.status = 'APPROVED' THEN 'approved'
                WHEN NEW.status = 'REJECTED' THEN 'rejected'
                ELSE LOWER(NEW.status)
            END;

            -- RECIPIENTS: Creator + Admins + Supervisors + Finance
            FOR target_user IN 
                SELECT DISTINCT user_id FROM (
                    SELECT user_id FROM user_roles WHERE role IN ('admin', 'supervisor', 'finance')
                    UNION
                    SELECT NEW.created_by as user_id
                ) all_targets
                WHERE user_id IS NOT NULL
            LOOP
                -- IF target_user.user_id != auth.uid() THEN
                    INSERT INTO notifications (user_id, type, category, title, description, link, metadata)
                    VALUES (
                        target_user.user_id, 
                        'info', 
                        'finance',
                        'Reimbursement • ' || p_code,
                        actor_name || ' ' || action_text || ' ' || NEW.description,
                        '/flow/finance/reimburse',
                        jsonb_build_object('requestId', NEW.id, 'projectId', NEW.project_id, 'actor', actor_name)
                    );
                -- END IF;
            END LOOP;
        END IF;
     EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Notification Error: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RECREATE TRIGGERS (Ensure they exist)
-- ROBUST CLEANUP: Drop ALL existing triggers closely related to these functions to prevent duplicates
DO $$
DECLARE
    t_rec record;
BEGIN
    -- 1. Cleanup Purchasing Triggers
    FOR t_rec IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'purchasing_requests' 
        AND trigger_name LIKE '%notify_purchasing%'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(t_rec.trigger_name) || ' ON purchasing_requests';
    END LOOP;

    -- 2. Cleanup Reimbursement Triggers
    FOR t_rec IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'reimbursement_requests' 
        AND trigger_name LIKE '%notify_reimbursement%'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(t_rec.trigger_name) || ' ON reimbursement_requests';
    END LOOP;
END $$;

-- RECREATE TRIGGERS (Once, Cleanly)
CREATE TRIGGER tr_notify_purchasing_status
    AFTER INSERT OR UPDATE ON purchasing_requests
    FOR EACH ROW
    EXECUTE PROCEDURE notify_purchasing_status_change();

CREATE TRIGGER tr_notify_reimbursement_status
    AFTER INSERT OR UPDATE ON reimbursement_requests
    FOR EACH ROW
    EXECUTE PROCEDURE notify_reimbursement_status_change();

-- Function to notify on Crew Request changes
CREATE OR REPLACE FUNCTION notify_crew_request_change()
RETURNS TRIGGER AS $$
DECLARE
    admin_record RECORD;
    type_label TEXT;
    status_label TEXT;
    details_text TEXT;
    crew_name_text TEXT;
BEGIN
    -- Set search path for security
    PERFORM set_config('search_path', 'public', true);

    -- Get Crew Name
    SELECT COALESCE(name, 'A crew member') INTO crew_name_text FROM public.crew_members WHERE id = NEW.crew_id;
    crew_name_text := COALESCE(crew_name_text, 'A crew member');

    -- Determine Type Label
    type_label := CASE 
        WHEN NEW.type = 'LEAVE' THEN 'Leave'
        WHEN NEW.type = 'KASBON' THEN 'Cash Advance'
        WHEN NEW.type = 'REIMBURSE' THEN 'Reimbursement'
        ELSE COALESCE(NEW.type::TEXT, 'Request')
    END;

    -- 1. NOTIFY ADMINS ON NEW REQUEST
    IF (TG_OP = 'INSERT') THEN
        details_text := CASE 
            WHEN NEW.type = 'LEAVE' THEN 
                CASE 
                    WHEN NEW.end_date IS NOT NULL AND NEW.end_date != NEW.start_date 
                    THEN COALESCE(NEW.start_date::TEXT, 'N/A') || ' to ' || COALESCE(NEW.end_date::TEXT, 'N/A')
                    ELSE COALESCE(NEW.start_date::TEXT, 'N/A')
                END
            ELSE 'Rp ' || COALESCE(NEW.amount, 0)::TEXT
        END;

        -- Notify all management roles
        FOR admin_record IN (
            SELECT DISTINCT user_id::uuid FROM (
                SELECT id as user_id FROM public.profiles 
                WHERE LOWER(role) IN ('admin', 'superadmin', 'supervisor', 'finance', 'management', 'ceo', 'owner', 'administrator', 'manager', 'hr', 'pm', 'director')
                UNION
                SELECT user_id FROM public.user_roles 
                WHERE LOWER(role) IN ('admin', 'superadmin', 'super_admin', 'supervisor', 'finance', 'management', 'ceo', 'owner', 'administrator', 'manager', 'hr', 'pm', 'director')
            ) all_admins
            WHERE user_id IS NOT NULL
        ) LOOP
            -- INSERT Notification for Admin
            -- NOTE: We are NOT excluding NEW.created_by for now to allow user verification
            INSERT INTO public.notifications (user_id, type, category, title, description, link, metadata)
            VALUES (
                admin_record.user_id,
                'info'::notification_type,
                'crew',
                'Crew Request • ' || type_label,
                crew_name_text || ' submitted ' || type_label || ' for ' || details_text,
                '/feel/crew?tab=requests&requestId=' || NEW.id::TEXT,
                jsonb_build_object('requestId', NEW.id, 'crewId', NEW.crew_id)
            );
        END LOOP;
    END IF;

    -- 2. NOTIFY REQUESTER ON STATUS CHANGE
    IF (TG_OP = 'UPDATE') AND (OLD.status IS DISTINCT FROM NEW.status) AND (NEW.created_by IS NOT NULL) THEN
        status_label := CASE 
            WHEN NEW.status = 'APPROVED' THEN '✅ APPROVED'
            WHEN NEW.status = 'REJECTED' THEN '❌ REJECTED'
            WHEN NEW.status = 'CANCELED' THEN '🚫 CANCELED'
            ELSE COALESCE(NEW.status::TEXT, 'Updated')
        END;

        details_text := CASE 
            WHEN NEW.type = 'LEAVE' THEN 
                CASE 
                    WHEN NEW.end_date IS NOT NULL AND NEW.end_date != NEW.start_date 
                    THEN COALESCE(NEW.start_date::TEXT, 'N/A') || ' to ' || COALESCE(NEW.end_date::TEXT, 'N/A')
                    ELSE COALESCE(NEW.start_date::TEXT, 'N/A')
                END
            ELSE 'Rp ' || COALESCE(NEW.amount, 0)::TEXT 
        END;

        INSERT INTO public.notifications (user_id, type, category, title, description, link, metadata)
        VALUES (
            NEW.created_by,
            CASE WHEN NEW.status = 'APPROVED' THEN 'success'::notification_type ELSE 'warning'::notification_type END,
            'crew',
            'Crew Request ✅ ' || NEW.status,
            crew_name_text || ' ' || type_label || ' Request for ' || details_text || 
            ' has been ' || LOWER(COALESCE(NEW.status::TEXT, 'processed')) || '.',
            '/feel/crew?tab=requests&requestId=' || NEW.id::TEXT,
            jsonb_build_object('requestId', NEW.id, 'status', NEW.status)
        );
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Prevent blocking the main transaction if notification fails
    RAISE WARNING 'Crew Notification Error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for Crew Requests
DROP TRIGGER IF EXISTS tr_notify_crew_request ON public.crew_requests;
CREATE TRIGGER tr_notify_crew_request
    AFTER INSERT OR UPDATE ON public.crew_requests
    FOR EACH ROW
    EXECUTE PROCEDURE notify_crew_request_change();


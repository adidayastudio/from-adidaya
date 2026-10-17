-- Backfill Script: Generate Notifications for Admins/Supervisors for past Purchasing Requests
-- Reason: Previous logic only notified the Creator (Staff). Supervisors expect to see this history.

DO $$
DECLARE
    target_role RECORD;
    req RECORD;
    p_code TEXT;
    actor_name TEXT;
    already_exists BOOLEAN;
BEGIN
    -- 1. Loop through all Purchasing Requests that are NOT in Draft
    FOR req IN 
        SELECT pr.*, p.project_code, u.full_name as creator_name
        FROM purchasing_requests pr
        LEFT JOIN projects p ON p.id = pr.project_id
        LEFT JOIN profiles u ON u.id = pr.created_by
        WHERE pr.approval_status != 'DRAFT' -- Only real requests
        ORDER BY pr.created_at DESC
    LOOP
        p_code := COALESCE(req.project_code, 'N/A');
        actor_name := COALESCE(req.creator_name, 'Unknown Staff');

        -- 2. Loop through all Admins, Supervisors, Finance users
        FOR target_role IN 
            SELECT DISTINCT user_id 
            FROM user_roles 
            WHERE role IN ('admin', 'supervisor', 'finance')
            AND user_id IS NOT NULL
        LOOP
            -- 3. Check if notification already exists for this user/request (naive check by link/title)
            -- We want to avoid duplicates if we run this multiple times.
            SELECT EXISTS (
                SELECT 1 FROM notifications 
                WHERE user_id = target_role.user_id 
                AND metadata->>'requestId' = req.id::text
                AND type = 'info'
            ) INTO already_exists;

            IF NOT already_exists THEN
                INSERT INTO notifications (
                    user_id, 
                    type, 
                    category, 
                    title, 
                    description, 
                    link, 
                    metadata, 
                    created_at, 
                    is_read
                ) VALUES (
                    target_role.user_id,
                    'info',
                    'finance',
                    'Purchasing • ' || p_code,
                    actor_name || ' submitted ' || req.description,
                    '/flow/finance/purchasing',
                    jsonb_build_object('requestId', req.id, 'projectId', req.project_id, 'actor', actor_name, 'backfilled', true),
                    req.created_at, -- Keep original timestamp!
                    true -- Mark backfilled as READ so we don't spam 100 unread badges
                );
            END IF;
        END LOOP;
    END LOOP;
END $$;

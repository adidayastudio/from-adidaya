-- Drop table to reset structure (Development only)
DROP TABLE IF EXISTS notifications CASCADE;

-- Create Notification Type Enum
-- Create Notification Type Enum if not exists
DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('info', 'mention', 'approval', 'system', 'success', 'warning');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Ensure new values exist (for existing enums)
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'success';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'warning';

-- Create Notifications Table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type notification_type NOT NULL DEFAULT 'info',
    category TEXT DEFAULT 'system', -- 'finance', 'projects', 'system'
    title TEXT NOT NULL,
    description TEXT,
    link TEXT,
    is_read BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Enable Realtime (Ignore if publication doesn't exist or table already added)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION
    WHEN undefined_object THEN null; -- Publication might not exist in local dev
    WHEN duplicate_object THEN null; -- Table might already be in publication
END $$;

-- Policies
CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create notifications" ON notifications;
CREATE POLICY "Users can create notifications"
    ON notifications FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Function to notify on Purchasing Status Change
CREATE OR REPLACE FUNCTION notify_purchasing_status_change()
RETURNS TRIGGER AS $$
DECLARE
    p_code TEXT;
    actor_name TEXT;
    action_text TEXT;
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
             INSERT INTO notifications (user_id, type, category, title, description, link, metadata)
            VALUES (
                NEW.created_by, 
                'info',
                'finance',
                'Purchasing • ' || p_code,
                actor_name || ' submitted ' || NEW.description,
                '/flow/finance/purchasing',
                jsonb_build_object('requestId', NEW.id, 'projectId', NEW.project_id, 'actor', actor_name)
            );
            RETURN NEW;
        END IF;

        IF (TG_OP = 'UPDATE') THEN
            -- 1. Approval Status Changes (Approve, Reject)
            IF (OLD.approval_status IS DISTINCT FROM NEW.approval_status) THEN
                action_text := CASE 
                    WHEN NEW.approval_status = 'APPROVED' THEN 'approved'
                    WHEN NEW.approval_status = 'REJECTED' THEN 'rejected'
                    ELSE LOWER(NEW.approval_status)
                END;

                INSERT INTO notifications (user_id, type, category, title, description, link, metadata)
                VALUES (
                    NEW.created_by, 
                    'info', -- Fallback to 'info' to ensure delivery
                    'finance',
                    'Purchasing • ' || p_code,
                    actor_name || ' ' || action_text || ' ' || NEW.description,
                    '/flow/finance/purchasing',
                    jsonb_build_object('requestId', NEW.id, 'projectId', NEW.project_id, 'actor', actor_name)
                );
            END IF;

            -- 2. Financial Status Changes (Paid)
            IF (OLD.financial_status IS DISTINCT FROM NEW.financial_status) AND (NEW.financial_status = 'PAID') THEN
                INSERT INTO notifications (user_id, type, category, title, description, link, metadata)
                VALUES (
                    NEW.created_by, 
                    'info', -- Fallback to 'info' to ensure delivery
                    'finance',
                    'Purchasing • ' || p_code,
                    actor_name || ' marking as paid: ' || NEW.description,
                    '/flow/finance/purchasing',
                    jsonb_build_object('requestId', NEW.id, 'projectId', NEW.project_id, 'actor', actor_name)
                );
            END IF;

            -- 3. Stage Changes (Invoiced, Received)
            IF (OLD.purchase_stage IS DISTINCT FROM NEW.purchase_stage) AND (NEW.purchase_stage IN ('INVOICED', 'RECEIVED')) THEN
                action_text := CASE 
                    WHEN NEW.purchase_stage = 'INVOICED' THEN 'uploaded invoice for'
                    WHEN NEW.purchase_stage = 'RECEIVED' THEN 'received goods for'
                    ELSE LOWER(NEW.purchase_stage)
                END;

                 INSERT INTO notifications (user_id, type, category, title, description, link, metadata)
                VALUES (
                    NEW.created_by, 
                    'info',
                    'finance',
                    'Purchasing • ' || p_code,
                    actor_name || ' ' || action_text || ' ' || NEW.description,
                    '/flow/finance/purchasing',
                    jsonb_build_object('requestId', NEW.id, 'projectId', NEW.project_id, 'actor', actor_name)
                );
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Verify logic: Do not block the transaction if notification fails
        RAISE WARNING 'Notification Error: %', SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for Purchasing
DROP TRIGGER IF EXISTS tr_notify_purchasing_status ON purchasing_requests;
CREATE TRIGGER tr_notify_purchasing_status
    AFTER INSERT OR UPDATE ON purchasing_requests
    FOR EACH ROW
    EXECUTE PROCEDURE notify_purchasing_status_change();

-- Function to notify on Reimbursement Status Change
CREATE OR REPLACE FUNCTION notify_reimbursement_status_change()
RETURNS TRIGGER AS $$
DECLARE
    p_code TEXT;
    actor_name TEXT;
    action_text TEXT;
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
             INSERT INTO notifications (user_id, type, category, title, description, link, metadata)
            VALUES (
                NEW.created_by, 
                'info',
                'finance',
                'Reimbursement • ' || p_code,
                actor_name || ' submitted ' || NEW.description,
                '/flow/finance/reimburse',
                jsonb_build_object('requestId', NEW.id, 'projectId', NEW.project_id, 'actor', actor_name)
            );
            RETURN NEW;
        END IF;

        IF (TG_OP = 'UPDATE') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
             action_text := CASE 
                WHEN NEW.status = 'APPROVED' THEN 'approved'
                WHEN NEW.status = 'REJECTED' THEN 'rejected'
                ELSE LOWER(NEW.status)
            END;

            -- Insert Notification
            INSERT INTO notifications (user_id, type, category, title, description, link, metadata)
            VALUES (
                NEW.created_by, 
                'info', -- Fallback to 'info'
                'finance',
                'Reimbursement • ' || p_code,
                actor_name || ' ' || action_text || ' ' || NEW.description,
                '/flow/finance/reimburse',
                jsonb_build_object('requestId', NEW.id, 'projectId', NEW.project_id, 'actor', actor_name)
            );
        END IF;
     EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Notification Error: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;




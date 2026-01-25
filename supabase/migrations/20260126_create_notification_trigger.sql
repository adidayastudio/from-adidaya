-- Enable the pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Trigger function to call the edge function
CREATE OR REPLACE FUNCTION public.handle_new_notification()
RETURNS TRIGGER AS $$
DECLARE
    project_id TEXT;
    service_role_key TEXT;
BEGIN
    -- Try to get project ID and service role key
    -- Fallback to hardcoded if vault is not used (Optional: User can replace these)
    SELECT value INTO project_id FROM vault.decrypted_secrets WHERE name = 'SUPABASE_PROJECT_ID';
    SELECT value INTO service_role_key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY';

    -- Only proceed if we have the credentials
    IF project_id IS NOT NULL AND service_role_key IS NOT NULL THEN
        PERFORM
            net.http_post(
                url := 'https://' || project_id || '.supabase.co/functions/v1/push-notifications',
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || service_role_key
                ),
                body := jsonb_build_object('record', row_to_json(NEW))
            );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove existing trigger if it exists to avoid "already exists" error
DROP TRIGGER IF EXISTS on_notification_created ON public.notifications;

-- Create the trigger on notifications table
CREATE TRIGGER on_notification_created
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_notification();

-- Enable the pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Trigger function to call the edge function
-- WE WRAP EVERYTHING IN AN EXCEPTION BLOCK TO ENSURE NOTIFICATIONS ARE ALWAYS SAVED
-- EVEN IF THE PUSH SIGNAL FAILS
CREATE OR REPLACE FUNCTION public.handle_new_notification()
RETURNS TRIGGER AS $$
DECLARE
    project_id TEXT;
    service_role_key TEXT;
BEGIN
    BEGIN
        -- Try to get project ID and service role key
        -- We handle the case where 'vault' might not be enabled or permissions denied
        SELECT decrypted_secret INTO project_id FROM vault.decrypted_secrets WHERE name = 'PROJECT_ID';
        SELECT decrypted_secret INTO service_role_key FROM vault.decrypted_secrets WHERE name = 'SERVICE_ROLE_KEY';

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

    EXCEPTION WHEN OTHERS THEN
        -- WE LOG TO WARNING AND CONTINUE. 
        -- THIS PREVENTS THE "INSERT" INTO NOTIFICATIONS FROM ROLLING BACK.
        RAISE WARNING 'Push Notification Notification System Alert: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove existing trigger if it exists
DROP TRIGGER IF EXISTS on_notification_created ON public.notifications;

-- Create the trigger on notifications table
CREATE TRIGGER on_notification_created
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_notification();

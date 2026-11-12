CREATE OR REPLACE FUNCTION public.notify_purchasing_partial_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    previous_paid numeric := coalesce(OLD.paid_amount, 0);
    current_paid numeric := coalesce(NEW.paid_amount, 0);
    request_total numeric := coalesce(NEW.approved_amount, NEW.amount, 0);
BEGIN
    IF current_paid <= previous_paid
       OR current_paid >= request_total
       OR NEW.financial_status = 'PAID' THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.notifications (user_id, type, category, title, description, link, metadata)
    SELECT recipients.user_id, 'info', 'finance', 'Purchasing • Partially Paid',
           coalesce(nullif(NEW.description, ''), 'Purchase request'),
           '/flow/finance?requestId=' || NEW.id::text || '&requestType=purchasing',
           jsonb_build_object(
               'requestId', NEW.id,
               'requestType', 'purchasing',
               'projectId', NEW.project_id,
               'module', 'Purchasing',
               'action', 'partially_paid',
               'subjectUser', 'Finance',
               'paymentAmount', current_paid - previous_paid,
               'paidAmount', current_paid,
               'remainingAmount', request_total - current_paid
           )
    FROM (
        SELECT NEW.created_by AS user_id
        UNION
        SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'supervisor', 'finance')
    ) AS recipients
    WHERE recipients.user_id IS NOT NULL;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Partial payment notification failed for purchasing request %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_notify_purchasing_partial_payment ON public.purchasing_requests;
CREATE TRIGGER tr_notify_purchasing_partial_payment
AFTER UPDATE OF paid_amount ON public.purchasing_requests
FOR EACH ROW
WHEN (OLD.paid_amount IS DISTINCT FROM NEW.paid_amount)
EXECUTE FUNCTION public.notify_purchasing_partial_payment();

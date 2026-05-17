-- ==========================================================
-- Align task schema status and priority values with lowercase adidaya-rn mobile schema
-- ==========================================================

-- 1. Convert existing uppercase task status values to lowercase equivalents
UPDATE public.tasks
SET status = 'todo'
WHERE UPPER(status) = 'TODO';

UPDATE public.tasks
SET status = 'in_progress'
WHERE UPPER(status) = 'IN PROGRESS' OR status = 'IN_PROGRESS';

UPDATE public.tasks
SET status = 'revision'
WHERE UPPER(status) = 'REVISION';

UPDATE public.tasks
SET status = 'done'
WHERE UPPER(status) = 'DONE';

-- 2. Convert existing uppercase task priority values to lowercase equivalents
UPDATE public.tasks
SET priority = 'low'
WHERE UPPER(priority) = 'LOW';

UPDATE public.tasks
SET priority = 'medium'
WHERE UPPER(priority) = 'MEDIUM';

UPDATE public.tasks
SET priority = 'high'
WHERE UPPER(priority) = 'HIGH';

UPDATE public.tasks
SET priority = 'urgent'
WHERE UPPER(priority) = 'URGENT';

-- 3. Adjust defaults for future inserts
ALTER TABLE public.tasks ALTER COLUMN status SET DEFAULT 'todo';
ALTER TABLE public.tasks ALTER COLUMN priority SET DEFAULT 'medium';

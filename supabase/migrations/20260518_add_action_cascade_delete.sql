-- Alter actions source_task_id foreign key constraint to ON DELETE CASCADE
-- This ensures that when a task is deleted, the corresponding actions are automatically cascade deleted.

ALTER TABLE public.actions 
DROP CONSTRAINT IF EXISTS actions_source_task_id_fkey;

ALTER TABLE public.actions 
ADD CONSTRAINT actions_source_task_id_fkey 
FOREIGN KEY (source_task_id) 
REFERENCES public.tasks(id) 
ON DELETE CASCADE;

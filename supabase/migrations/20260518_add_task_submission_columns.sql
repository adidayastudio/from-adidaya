-- Add submission columns to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS submission_note TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS submission_urls TEXT;

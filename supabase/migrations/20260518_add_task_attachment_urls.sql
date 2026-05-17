-- Add attachment_urls column to support multiple attachments in tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS attachment_urls TEXT;

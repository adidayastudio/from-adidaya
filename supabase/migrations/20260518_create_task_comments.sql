-- Create task comments table
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable RLS
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Enable read access for authenticated users on task comments" 
ON public.task_comments FOR SELECT USING (auth.role() = 'authenticated');

-- Allow insert access to authenticated users
CREATE POLICY "Enable insert for authenticated users on task comments" 
ON public.task_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

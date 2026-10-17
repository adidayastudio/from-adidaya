-- Migration: Create Project Taxonomy Indexes & Custom Sub-Indexes Table
-- Author: ADIDAYA Engineering
-- Created At: 2026-08-17

CREATE TABLE IF NOT EXISTS public.project_taxonomy_indexes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    parent_id TEXT NOT NULL, -- e.g. '10-19', '17-19', '20-01-00'
    code VARCHAR(30) NOT NULL, -- e.g. '17 00 00', '20 01 05'
    title TEXT NOT NULL, -- e.g. 'Vendor Qualification Assessment'
    is_custom BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by project_id and parent_id
CREATE INDEX IF NOT EXISTS idx_taxonomy_project_parent ON public.project_taxonomy_indexes(project_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_taxonomy_code ON public.project_taxonomy_indexes(code);

-- Enable Row Level Security (RLS)
ALTER TABLE public.project_taxonomy_indexes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow read taxonomy for authenticated users" ON public.project_taxonomy_indexes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert/update taxonomy for authenticated users" ON public.project_taxonomy_indexes
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

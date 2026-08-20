-- =========================================
-- Add ahsp_id column to project_wbs_items
-- =========================================
-- Fixes error: "Could not find the 'ahsp_id' column of 'project_wbs_items' in the schema cache"
-- The ahsp_id column links WBS items to their assigned AHSP (Analisa Harga Satuan Pekerjaan).
-- This column already exists on `work_breakdown_structure` (template table) via migration 021,
-- but was never added to the per-project `project_wbs_items` table.

ALTER TABLE public.project_wbs_items
ADD COLUMN IF NOT EXISTS ahsp_id UUID REFERENCES public.ahsp_masters(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.project_wbs_items.ahsp_id IS 'Reference to the assigned AHSP master for this WBS item';

-- Index for faster lookups when querying WBS items by AHSP
CREATE INDEX IF NOT EXISTS idx_project_wbs_items_ahsp_id ON public.project_wbs_items(ahsp_id);

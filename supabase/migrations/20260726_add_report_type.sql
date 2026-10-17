-- Migration to add report_type to project_reports table
ALTER TABLE project_reports 
ADD COLUMN IF NOT EXISTS report_type text CHECK (report_type IN ('daily', 'weekly', 'monthly')) NOT NULL DEFAULT 'daily';

-- Index for filtering by report type
CREATE INDEX IF NOT EXISTS idx_project_reports_type ON project_reports(report_type);

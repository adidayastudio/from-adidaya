-- Migration to add report_category to project_reports table
ALTER TABLE project_reports 
ADD COLUMN IF NOT EXISTS report_category text;

-- Create index for report_category
CREATE INDEX IF NOT EXISTS idx_project_reports_category ON project_reports(report_category);

-- Drop report_type check constraint if present so extended report types are accepted
ALTER TABLE project_reports DROP CONSTRAINT IF EXISTS project_reports_report_type_check;

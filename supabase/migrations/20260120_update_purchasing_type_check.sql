-- Migration: Update purchasing_requests type check constraint
-- to support new category values

-- Drop old constraint
ALTER TABLE purchasing_requests DROP CONSTRAINT IF EXISTS purchasing_requests_type_check;

-- Add new constraint with updated category values
ALTER TABLE purchasing_requests ADD CONSTRAINT purchasing_requests_type_check 
CHECK (type IN (
    'MATERIAL',
    'TOOLS_EQUIPMENT',
    'SERVICES',
    'PROJECT_OPERATIONS',
    'OFFICE_OPERATIONS',
    'ASSETS_INVENTORY',
    'FINANCIAL_LEGAL',
    'SPECIAL',
    -- Keep old values for backward compatibility with existing records
    'TOOL',
    'SERVICE', 
    'SUPPORT'
));

-- Optional: Update old records to use new values (uncomment if needed)
-- UPDATE purchasing_requests SET type = 'TOOLS_EQUIPMENT' WHERE type = 'TOOL';
-- UPDATE purchasing_requests SET type = 'SERVICES' WHERE type = 'SERVICE';
-- UPDATE purchasing_requests SET type = 'PROJECT_OPERATIONS' WHERE type = 'SUPPORT';

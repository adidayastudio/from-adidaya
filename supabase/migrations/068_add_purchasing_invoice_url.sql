-- Add invoice_url to purchasing_requests
ALTER TABLE purchasing_requests ADD COLUMN IF NOT EXISTS invoice_url TEXT;

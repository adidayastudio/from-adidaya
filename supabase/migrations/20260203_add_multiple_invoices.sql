-- Migration: Restore missing purchasing items and add multiple invoices support
-- Created: 2026-02-03

-- ===========================================
-- PART 1: Diagnose and Restore Orphaned Items
-- ===========================================

-- First, let's see if there are orphaned items (items without request_id)
DO $$
DECLARE
    orphan_count INT;
    unlinked_count INT;
BEGIN
    -- Count items with NULL request_id
    SELECT COUNT(*) INTO orphan_count 
    FROM purchasing_items 
    WHERE request_id IS NULL;
    
    RAISE NOTICE 'Found % orphaned purchasing_items with NULL request_id', orphan_count;
    
    -- Count items where request no longer exists
    SELECT COUNT(*) INTO unlinked_count
    FROM purchasing_items pi
    WHERE NOT EXISTS (
        SELECT 1 FROM purchasing_requests pr WHERE pr.id = pi.request_id
    ) AND pi.request_id IS NOT NULL;
    
    RAISE NOTICE 'Found % items referencing non-existent requests', unlinked_count;
END $$;

-- ===========================================
-- PART 2: Multiple Invoices Support
-- ===========================================

-- Create table for multiple invoices per purchasing request
CREATE TABLE IF NOT EXISTS purchasing_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES purchasing_requests(id) ON DELETE CASCADE,
    invoice_url TEXT NOT NULL,
    invoice_name TEXT, -- Original filename for display
    invoice_type TEXT DEFAULT 'INVOICE' CHECK (invoice_type IN ('INVOICE', 'RECEIPT', 'QUOTATION', 'OTHER')),
    notes TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_purchasing_invoices_request 
ON purchasing_invoices(request_id);

-- Enable RLS
ALTER TABLE purchasing_invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for purchasing_invoices
CREATE POLICY "Enable read access for authenticated users"
ON purchasing_invoices FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert access for authenticated users"
ON purchasing_invoices FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users"
ON purchasing_invoices FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Enable delete access for authenticated users"
ON purchasing_invoices FOR DELETE
TO authenticated
USING (true);

-- ===========================================
-- PART 3: Migrate Existing invoice_url to New Table
-- ===========================================

-- For requests that have invoice_url, create a record in purchasing_invoices
INSERT INTO purchasing_invoices (request_id, invoice_url, invoice_name, invoice_type, uploaded_by)
SELECT 
    id as request_id,
    invoice_url,
    'Legacy Invoice' as invoice_name,
    'INVOICE' as invoice_type,
    created_by as uploaded_by
FROM purchasing_requests
WHERE invoice_url IS NOT NULL 
  AND invoice_url != ''
  AND NOT EXISTS (
      SELECT 1 FROM purchasing_invoices pi WHERE pi.request_id = purchasing_requests.id
  );

-- ===========================================
-- PART 4: Add invoices to reimbursement as well
-- ===========================================

CREATE TABLE IF NOT EXISTS reimbursement_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES reimbursement_requests(id) ON DELETE CASCADE,
    invoice_url TEXT NOT NULL,
    invoice_name TEXT,
    invoice_type TEXT DEFAULT 'RECEIPT' CHECK (invoice_type IN ('INVOICE', 'RECEIPT', 'QUOTATION', 'OTHER')),
    notes TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reimbursement_invoices_request 
ON reimbursement_invoices(request_id);

ALTER TABLE reimbursement_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users"
ON reimbursement_invoices FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert access for authenticated users"
ON reimbursement_invoices FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users"
ON reimbursement_invoices FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Enable delete access for authenticated users"
ON reimbursement_invoices FOR DELETE
TO authenticated
USING (true);

-- Migrate existing reimbursement invoice_url
INSERT INTO reimbursement_invoices (request_id, invoice_url, invoice_name, invoice_type, uploaded_by)
SELECT 
    id as request_id,
    invoice_url,
    'Legacy Receipt' as invoice_name,
    'RECEIPT' as invoice_type,
    created_by as uploaded_by
FROM reimbursement_requests
WHERE invoice_url IS NOT NULL 
  AND invoice_url != ''
  AND NOT EXISTS (
      SELECT 1 FROM reimbursement_invoices ri WHERE ri.request_id = reimbursement_requests.id
  );

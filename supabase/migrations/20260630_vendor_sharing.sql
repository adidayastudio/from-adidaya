-- Migration: Vendor Sharing Portal Setup
-- Date: 2026-06-30
-- Description: Create vendor_portals table and link to purchasing_requests with proper RLS policies.

-- 1. Create vendor_portals table
CREATE TABLE IF NOT EXISTS vendor_portals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_name TEXT NOT NULL UNIQUE,
    token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for token lookup
CREATE INDEX IF NOT EXISTS idx_vendor_portals_token ON vendor_portals(token);

-- 2. Add vendor_portal_id to purchasing_requests
ALTER TABLE purchasing_requests ADD COLUMN IF NOT EXISTS vendor_portal_id UUID REFERENCES vendor_portals(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_purchasing_requests_vendor_portal ON purchasing_requests(vendor_portal_id);

-- Enable RLS for vendor_portals
ALTER TABLE vendor_portals ENABLE ROW LEVEL SECURITY;

-- Policies for vendor_portals
DROP POLICY IF EXISTS "Enable all access for authenticated users on vendor_portals" ON vendor_portals;
CREATE POLICY "Enable all access for authenticated users on vendor_portals"
ON vendor_portals FOR ALL
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Enable anon read access for vendor_portals by token" ON vendor_portals;
CREATE POLICY "Enable anon read access for vendor_portals by token"
ON vendor_portals FOR SELECT
TO anon
USING (true);

DROP POLICY IF EXISTS "Enable anon insert access for vendor_portals" ON vendor_portals;
CREATE POLICY "Enable anon insert access for vendor_portals"
ON vendor_portals FOR INSERT
TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable anon update access for vendor_portals" ON vendor_portals;
CREATE POLICY "Enable anon update access for vendor_portals"
ON vendor_portals FOR UPDATE
TO anon
USING (true);

-- Policies for purchasing_invoices to allow public select
DROP POLICY IF EXISTS "Enable anon read access for purchasing_invoices" ON purchasing_invoices;
CREATE POLICY "Enable anon read access for purchasing_invoices"
ON purchasing_invoices FOR SELECT
TO anon
USING (true);

-- Policies for purchasing_requests to allow public select
DROP POLICY IF EXISTS "Enable anon read access for purchasing_requests_portal" ON purchasing_requests;
CREATE POLICY "Enable anon read access for purchasing_requests_portal"
ON purchasing_requests FOR SELECT
TO anon
USING (true);

-- Policies for purchasing_items to allow public select
DROP POLICY IF EXISTS "Enable anon read access for purchasing_items_portal" ON purchasing_items;
CREATE POLICY "Enable anon read access for purchasing_items_portal"
ON purchasing_items FOR SELECT
TO anon
USING (true);

-- Policies for projects to allow public select
DROP POLICY IF EXISTS "Enable anon read access for projects_portal" ON projects;
CREATE POLICY "Enable anon read access for projects_portal"
ON projects FOR SELECT
TO anon
USING (true);

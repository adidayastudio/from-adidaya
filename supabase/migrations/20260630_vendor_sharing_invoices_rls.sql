-- Migration: Add RLS policies for anon access to purchasing_invoices
-- Date: 2026-06-30
-- Description: Allow anon insert, update, and delete access for purchasing_invoices to let vendors upload documents via portal.

DROP POLICY IF EXISTS "Enable anon insert access for purchasing_invoices" ON purchasing_invoices;
CREATE POLICY "Enable anon insert access for purchasing_invoices"
ON purchasing_invoices FOR INSERT
TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable anon update access for purchasing_invoices" ON purchasing_invoices;
CREATE POLICY "Enable anon update access for purchasing_invoices"
ON purchasing_invoices FOR UPDATE
TO anon
USING (true);

DROP POLICY IF EXISTS "Enable anon delete access for purchasing_invoices" ON purchasing_invoices;
CREATE POLICY "Enable anon delete access for purchasing_invoices"
ON purchasing_invoices FOR DELETE
TO anon
USING (true);

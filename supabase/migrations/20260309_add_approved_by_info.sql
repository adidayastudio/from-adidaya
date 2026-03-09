-- Migration: Add approved_by_name to finance tables
-- Date: 2026-03-09

-- 1. Add column to purchasing_requests
ALTER TABLE purchasing_requests ADD COLUMN IF NOT EXISTS approved_by_name TEXT;

-- 2. Add column to reimbursement_requests
ALTER TABLE reimbursement_requests ADD COLUMN IF NOT EXISTS approved_by_name TEXT;

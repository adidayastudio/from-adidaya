-- Migration: 004_refactor_terminology
-- Description: Refactor terminology (Categories -> Typologies, Project Types -> Scope Types terminology in UI but kept as project_type_templates in DB for stability)
--              Add 'code' column to templates for short identifiers.
--              Add 'parent_id' to typologies for hierarchy.

-- 1. Refactor Categories -> Typologies
ALTER TABLE IF EXISTS categories RENAME TO typologies;

-- 2. Add 'code' and 'parent_id' to Typologies
ALTER TABLE typologies 
ADD COLUMN IF NOT EXISTS code VARCHAR(10),
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES typologies(id) ON DELETE CASCADE;

-- 3. Add 'code' to Project Type Templates
ALTER TABLE project_type_templates 
ADD COLUMN IF NOT EXISTS code VARCHAR(10);

-- 4. Add 'code' to Location Factors
ALTER TABLE location_factors 
ADD COLUMN IF NOT EXISTS code VARCHAR(10);

-- 5. Add 'code' to Disciplines (if not exists, though usually it might)
ALTER TABLE disciplines 
ADD COLUMN IF NOT EXISTS code VARCHAR(10);

-- 6. Ensure Classes has 'code' (it was class_code, let's standardize on 'code' or keep class_code? Plan said 'code'. Let's add 'code' and migrate data if needed, or just rename class_code -> code. 
-- Existing API uses class_code. Let's rename for consistency if we want, or just use class_code.
-- User asked for "code (misal 3 huruf)". 
-- Let's rename class_code to code for consistency across all tables if possible, but that might break too much. 
-- Let's check if class_code exists. detailed plan said "Ensure class_code is VARCHAR(3)". 
-- I will keep class_code as is for now to avoid unnecessary breakage, or alias it in API.
-- Actually, for consistency, let's keep class_code as the column name but ensure type.

ALTER TABLE classes ALTER COLUMN class_code TYPE VARCHAR(10);

-- 7. Add comments for clarity
COMMENT ON TABLE typologies IS 'Formerly categories. Represents building typologies (e.g. Residential, Commercial).';
COMMENT ON COLUMN typologies.parent_id IS 'Self-reference for sub-typologies (e.g. Residential -> Apartment).';

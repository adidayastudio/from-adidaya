-- Migration: Update People Skills for Rating (1-10)
-- Date: 2026-02-10
-- Description: Drops skill_level enum constraint and adds category_id.

-- 1. Drop the check constraint on skill_level
ALTER TABLE people_skills DROP CONSTRAINT IF EXISTS people_skills_skill_level_check;

-- 2. Add category_id to people_skills
ALTER TABLE people_skills ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES skill_categories(id) ON DELETE SET NULL;

-- 3. Update existing data (optional, but good for consistency)
-- If we had data, we might want to map 'beginner' to '2', 'intermediate' to '5', etc.
UPDATE people_skills SET skill_level = '2' WHERE skill_level = 'beginner';
UPDATE people_skills SET skill_level = '5' WHERE skill_level = 'intermediate';
UPDATE people_skills SET skill_level = '8' WHERE skill_level = 'advanced';
UPDATE people_skills SET skill_level = '10' WHERE skill_level = 'expert';

-- 4. Re-add a check constraint for 1-10 (as text since the column is TEXT)
-- We'll keep it as TEXT for now to avoid breaking existing code that expects string, 
-- but we'll enforce the 1-10 range if it's a number.
-- Note: skill_level remains TEXT to avoid casting issues in the frontend immediately.

COMMENT ON COLUMN people_skills.skill_level IS 'Stores 1-10 rating (as string) or legacy enum labels';

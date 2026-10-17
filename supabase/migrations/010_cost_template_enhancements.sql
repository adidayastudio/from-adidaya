-- Migration: Enhance Cost Template Table
-- Purpose: Support multi-select default disciplines and detailed unit configurations

ALTER TABLE cost_templates 
ADD COLUMN IF NOT EXISTS default_disciplines TEXT[], -- Array of discipline codes e.g. ['ARC', 'STR']
ADD COLUMN IF NOT EXISTS unit_config JSONB DEFAULT '{}'::jsonb; -- { "length": "m", "area": "m2", "volume": "m3", "weight": "kg" }

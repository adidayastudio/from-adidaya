-- Migration: Add building mass count and masses specification to projects
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS building_mass_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS building_masses JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN projects.building_mass_count IS 'Number of building masses / zones in the project (default 1)';
COMMENT ON COLUMN projects.building_masses IS 'List of building mass objects [{ code: "A", name: "Main House", buildingArea: 200, floors: 2 }, ...]';

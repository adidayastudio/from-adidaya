ALTER TABLE crew_members ADD COLUMN IF NOT EXISTS initials VARCHAR(3);

COMMENT ON COLUMN crew_members.initials IS 'Unique 2-letter code for avatar placeholder (e.g. AD, AS)';

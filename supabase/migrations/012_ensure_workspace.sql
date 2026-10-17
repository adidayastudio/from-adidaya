-- Migration: Ensure Default Workspace Exists
-- Purpose: Fix "No Workspace ID" error by ensuring at least one workspace is present.
-- This is critical for Cost Templates which require a valid workspace_id.

INSERT INTO workspaces (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'Main Workspace', 'main-workspace')
ON CONFLICT (id) DO NOTHING;

-- If ID conflict, we do nothing (data exists).
-- If no conflict, we inserted the row.

-- Fix Crew Members Workspace ID
-- Migration 036 might have picked a different workspace ID than the active one.
-- This migration forces all crew members to belong to the active workspace ID provided by the user.

DO $$
DECLARE
    -- The ID observed in the Debug UI
    target_ws_id UUID := 'f39364e8-1376-4ff7-a716-78277e8d25b3'; 
BEGIN
    -- Update all crew members to point to this workspace
    UPDATE crew_members
    SET workspace_id = target_ws_id
    WHERE workspace_id != target_ws_id OR workspace_id IS NULL;
    
    -- Also update history if needed? (History doesn't have workspace_id, it links to crew_id so it follows)
    
EXCEPTION
    WHEN OTHERS THEN
        NULL; -- Ignore errors if ID doesn't exist (though it should)
END $$;

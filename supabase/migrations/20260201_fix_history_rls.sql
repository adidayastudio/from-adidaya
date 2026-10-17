-- Relax RLS for career_history to allow authenticated users to add history
-- primarily for testing purposes or self-updates

DROP POLICY IF EXISTS "Admins can insert" ON career_history;

CREATE POLICY "Authenticated users can insert" ON career_history FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
);

-- Also allow update/delete for own records just in case
CREATE POLICY "Users can update own history" ON career_history FOR UPDATE USING (
    auth.uid() = user_id
);

CREATE POLICY "Users can delete own history" ON career_history FOR DELETE USING (
    auth.uid() = user_id
);

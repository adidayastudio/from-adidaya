-- Create career_history table

CREATE TABLE IF NOT EXISTS career_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    type TEXT CHECK (type IN ('Promotion', 'Contract', 'Join', 'Transfer', 'Other')) DEFAULT 'Other',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE career_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read access" ON career_history FOR SELECT USING (true);
CREATE POLICY "Admins can insert" ON career_history FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('admin', 'super_admin'))
);
CREATE POLICY "Admins can update" ON career_history FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('admin', 'super_admin'))
);
CREATE POLICY "Admins can delete" ON career_history FOR DELETE USING (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('admin', 'super_admin'))
);

-- Index
CREATE INDEX idx_career_history_user_id ON career_history(user_id);

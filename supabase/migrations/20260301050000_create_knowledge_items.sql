-- Create Knowledge Items Table
CREATE TABLE IF NOT EXISTS knowledge_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('documentation', 'templates', 'references')),
    type TEXT NOT NULL,
    department TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_favorite BOOLEAN DEFAULT FALSE,
    format TEXT,
    file_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE knowledge_items ENABLE ROW LEVEL SECURITY;

-- Set up RLS Policies

-- 1. Everyone (authenticated) can view all knowledge items
DROP POLICY IF EXISTS "Anyone can view knowledge items" ON knowledge_items;
CREATE POLICY "Anyone can view knowledge items"
    ON knowledge_items FOR SELECT
    TO authenticated
    USING (true);

-- 2. Users can create their own knowledge items
DROP POLICY IF EXISTS "Users can create their own knowledge items" ON knowledge_items;
CREATE POLICY "Users can create their own knowledge items"
    ON knowledge_items FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 3. Users can update their own knowledge items
DROP POLICY IF EXISTS "Users can update their own knowledge items" ON knowledge_items;
CREATE POLICY "Users can update their own knowledge items"
    ON knowledge_items FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Users can delete their own knowledge items
DROP POLICY IF EXISTS "Users can delete their own knowledge items" ON knowledge_items;
CREATE POLICY "Users can delete their own knowledge items"
    ON knowledge_items FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 5. Managers/Admins can manage all knowledge items
DROP POLICY IF EXISTS "Managers can manage all knowledge items" ON knowledge_items;
CREATE POLICY "Managers can manage all knowledge items"
    ON knowledge_items FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superadmin', 'supervisor', 'pm')
        )
    );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_knowledge_items_updated_at
    BEFORE UPDATE ON knowledge_items
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

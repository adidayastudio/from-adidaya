-- Extended Profile Fields & Documents Table
-- Run this in Supabase SQL Editor

-- 1. Extend profiles table with new required fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_date date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nik text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS personal_email text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number text;

-- Ensure JSONB columns are initialized if they don't exist (though they should)
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}';
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address jsonb DEFAULT '{}';
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact jsonb DEFAULT '{}';
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_info jsonb DEFAULT '{}';

-- 2. Create User Documents Table
CREATE TABLE IF NOT EXISTS user_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'KTP', 'NPWP', 'CV', 'Diploma', 'Transcript', 'Other'
    file_path TEXT NOT NULL, -- Storage path
    file_type TEXT,
    size INTEGER,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Verified', 'Pending', 'Missing', 'Rejected')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. RLS for Documents
ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own documents
CREATE POLICY "Users can view own documents"
ON user_documents FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Admins can see all documents
CREATE POLICY "Admins can view all documents"
ON user_documents FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy: Users can upload their own documents
CREATE POLICY "Users can upload own documents"
ON user_documents FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own documents (maybe limit to Pending status?)
CREATE POLICY "Users can delete own documents"
ON user_documents FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 4. Storage Bucket Setup (Handled in Dashboard usually, but here for reference)
-- Please ensure a bucket named 'profile-documents' exists with proper RLS.

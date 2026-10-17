-- FINAL CONSOLIDATED FIX for Profiles Table
-- Run this in Supabase SQL Editor

-- 1. Ensure all missing columns exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nickname text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'human_account';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS system_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS employee_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS job_title text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS level text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS employment_type text DEFAULT 'Full Time';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birthday date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nik text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_links jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_info jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS include_in_timesheet boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS include_in_performance boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS include_in_attendance boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS include_in_people_analytics boolean DEFAULT true;

-- 2. Sync email from auth.users (One-time sync)
-- Note: This requires access to auth schema, which should work in Supabase SQL editor.
DO $$
BEGIN
    UPDATE public.profiles p
    SET email = u.email
    FROM auth.users u
    WHERE p.id = u.id
    AND (p.email IS NULL OR p.email = '');
EXCEPTION
    WHEN others THEN 
        RAISE NOTICE 'Could not sync emails automatically. Ensure you have permissions or sync manually.';
END $$;

-- 3. Security: Allow Admins to edit any profile
-- Drop old policy if exists
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

CREATE POLICY "Admins can update all profiles"
ON profiles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- 4. Enable RLS (Should be already, but to be sure)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 5. Grant access for authenticated users to view profiles (already exists, but verifying)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing likely conflicting policies to be safe
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON profiles;

-- Create comprehensive policies

-- 1. View: All authenticated users can view all profiles (Directory)
CREATE POLICY "Authenticated users can view all profiles" 
ON profiles FOR SELECT 
TO authenticated 
USING (true);

-- 2. Update: Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

-- 3. Insert: Users can insert their own profile (usually handled by triggers, but good to have)
CREATE POLICY "Users can insert their own profile" 
ON profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- Add email column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;

-- Optional: Create a trigger to sync email from auth.users (advanced, but for now we just add the column)
-- UPDATE profiles p SET email = u.email FROM auth.users u WHERE p.id = u.id;

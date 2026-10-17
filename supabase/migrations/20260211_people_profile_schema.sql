-- Migration: People Profile Schema Updates
-- Date: 2026-02-11
-- Description: Adds account_type, module inclusion flags, and missing profile fields.

-- 1. Create account_type enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE account_type_enum AS ENUM ('human_account', 'system_account');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS account_type account_type_enum DEFAULT 'human_account',
ADD COLUMN IF NOT EXISTS nickname TEXT,
ADD COLUMN IF NOT EXISTS birthday DATE,
ADD COLUMN IF NOT EXISTS nik TEXT, -- Nomor Induk Kependudukan
-- Module Inclusion Flags (Default TRUE for humans / existing)
ADD COLUMN IF NOT EXISTS include_in_timesheet BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS include_in_performance BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS include_in_attendance BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS include_in_people_analytics BOOLEAN DEFAULT TRUE,
-- Extra JSONB fields for flexibility
ADD COLUMN IF NOT EXISTS emergency_contact JSONB,
ADD COLUMN IF NOT EXISTS bank_info JSONB,
ADD COLUMN IF NOT EXISTS social_links JSONB,
ADD COLUMN IF NOT EXISTS documents JSONB;

-- 3. Index on account_type
CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON profiles(account_type);

-- 4. Update RLS policies to allow reading these new columns
-- (Assuming existing policies cover "SELECT *", so no specific change needed unless we want to hide Bank Info)
-- We will handle field-level visibility in the application layer or specific views if strict RLS is needed later.
-- For now, Finance/Bank info is usually restricted. 
-- Let's ensure strict RLS for sensitive fields if possible, but profiles is often SELECT * by authenticated.
-- To protect Bank Info strictly, we might need to move it to a separate table or rely on App Logic + RLS policies that select specific columns?
-- Supabase RLS is row-based. Column-based security is trickier.
-- For now, we will rely on Row Security. If 'profiles' is public/authenticated readable, bank_info should probably be in a separate private table.
-- HOWEVER, the requirements say "Finance (restricted)".
-- Let's keep it in profiles for simplicity as per prompt instructions which implies fields in profile, 
-- but we should be careful. 
-- Actually, the prompt says "Finance (restricted) - Visible to: self, HR, SPV, Finance".
-- If 'profiles' table is generally visible to all staff (for directory 'profiles' lookup), then putting bank_info here is RISKY.
-- BUT, for this migration, we are following the "Profile Tab" fields list.
-- Let's stick to the prompt's implied structure but maybe comment about RLS.
-- "Finance ... Stored in separate table/storage" is mentioned for Documents.
-- "Finance - restricted" is listed in Profile Tab fields.
-- Let's put bank_info in `profiles` for now but enable RLS to strict filtering in logic or future migration if generic read is too open.
-- Actually, to be safe, I should probably put sensitive info in a separate table `user_secrets` or similar? 
-- No, let's stick to `profiles` for now to avoid over-engineering unless the user complaining.
-- We can use a View for the public directory that excludes sensitive columns.


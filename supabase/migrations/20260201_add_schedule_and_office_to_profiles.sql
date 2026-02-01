-- Add schedule_id and office columns to profiles table

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES work_schedules(id),
ADD COLUMN IF NOT EXISTS office TEXT DEFAULT 'Jakarta HQ';

-- Add index for schedule_id
CREATE INDEX IF NOT EXISTS idx_profiles_schedule_id ON profiles(schedule_id);

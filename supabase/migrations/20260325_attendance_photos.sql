-- Migration script: Add photo support for attendance
-- Creates the `attendance_photos` storage bucket and updates related tables

-- 1. Create Storage Bucket for Attendance Photos
insert into storage.buckets (id, name, public)
values ('attendance_photos', 'attendance_photos', true)
on conflict (id) do nothing;

-- Set up security policies for the bucket (allow public reads, authenticated uploads)
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'attendance_photos' );

create policy "Authenticated users can upload photos"
on storage.objects for insert
with check ( bucket_id = 'attendance_photos' AND auth.role() = 'authenticated' );

-- 2. Update `attendance_logs` table
alter table public.attendance_logs
add column if not exists photo_url text;

-- 3. Update `attendance_sessions` table
alter table public.attendance_sessions
add column if not exists photo_url text;

-- 4. Update `attendance_records` table
-- Since there are checks-in and check-outs, we add a general photo_url (for daily summary if needed)
-- or check_in_photo_url and check_out_photo_url to be specific.
alter table public.attendance_records
add column if not exists check_in_photo_url text,
add column if not exists check_out_photo_url text;

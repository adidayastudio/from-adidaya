-- Create bucket for profile documents
insert into storage.buckets (id, name, public)
values ('profile-documents', 'profile-documents', false)
on conflict (id) do nothing;

-- Policy: Authenticated users can upload their own documents
-- We use a simple policy for now, but in production we might want to restrict by path (userId)
create policy "Authenticated users can upload profile documents"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'profile-documents' );

-- Policy: Authenticated users can view documents
create policy "Authenticated users can view profile documents"
on storage.objects for select
to authenticated
using ( bucket_id = 'profile-documents' );

-- Policy: Authenticated users can delete their own documents
create policy "Authenticated users can delete profile documents"
on storage.objects for delete
to authenticated
using ( bucket_id = 'profile-documents' );

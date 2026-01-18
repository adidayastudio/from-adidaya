-- Create bucket for finance attachments
insert into storage.buckets (id, name, public)
values ('finance_attachments', 'finance_attachments', false)
on conflict (id) do nothing;

-- Policy: Authenticated users can upload
create policy "Authenticated users can upload finance files"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'finance_attachments' );

-- Policy: Authenticated users can view
create policy "Authenticated users can view finance files"
on storage.objects for select
to authenticated
using ( bucket_id = 'finance_attachments' );

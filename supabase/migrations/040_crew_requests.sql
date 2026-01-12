
-- Create crew_requests table
create table if not exists crew_requests (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references workspaces(id) not null,
  crew_id uuid references crew_members(id) not null,
  type text not null check (type in ('LEAVE', 'KASBON', 'REIMBURSE', 'SICK', 'OTHER')),
  amount numeric,
  start_date date not null,
  end_date date,
  reason text,
  proof_url text,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table crew_requests enable row level security;

-- Policies
drop policy if exists "Enable all access for authenticated users" on crew_requests;
create policy "Enable all access for authenticated users" on crew_requests for all using (true) with check (true);

-- Indexes
create index if not exists idx_crew_requests_workspace on crew_requests(workspace_id);
create index if not exists idx_crew_requests_crew on crew_requests(crew_id);
create index if not exists idx_crew_requests_status on crew_requests(status);

-- Grants
grant all on crew_requests to authenticated;
grant all on crew_requests to service_role;
grant all on crew_requests to anon;

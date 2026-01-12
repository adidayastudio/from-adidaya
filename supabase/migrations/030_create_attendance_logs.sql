create type attendance_type as enum ('IN', 'OUT');

create table attendance_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type attendance_type not null,
  timestamp timestamptz default now() not null,
  created_at timestamptz default now()
);

-- RLS
alter table attendance_logs enable row level security;

create policy "Users can insert their own logs"
  on attendance_logs for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can view their own logs"
  on attendance_logs for select
  to authenticated
  using (auth.uid() = user_id);

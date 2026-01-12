create type user_role_enum as enum (
  'admin',
  'supervisor',
  'staff',
  'finance',
  'site',
  'operational'
);

create table user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role user_role_enum not null,
  created_at timestamptz default now(),
  unique (user_id, role)
);

-- RLS policies
alter table user_roles enable row level security;

create policy "Users can view their own roles"
  on user_roles for select
  using (auth.uid() = user_id);

-- Only admins/management should edit roles (skipping complex check for now, allowing all authed read, manual insert via dashboard/sql)
create policy "Allow read access to authenticated users"
  on user_roles for select
  to authenticated
  using (true);

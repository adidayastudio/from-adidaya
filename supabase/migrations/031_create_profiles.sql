create table profiles (
  id uuid primary key references auth.users(id) on delete cascade not null,
  username text unique,
  full_name text,
  avatar_url text,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- RLS
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on profiles for select
  using (true);

create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

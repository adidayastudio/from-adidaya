-- Create project_expenses table
create table if not exists project_expenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  description text not null,
  amount numeric not null,
  date date not null default current_date,
  category text,
  status text default 'Pending' check (status in ('Pending', 'Approved', 'Rejected', 'Paid')),
  receipt_url text
);

-- RLS Policies
alter table project_expenses enable row level security;

create policy "Users can view all expenses"
  on project_expenses for select
  using (true);

create policy "Users can insert their own expenses"
  on project_expenses for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own expenses"
  on project_expenses for update
  using (auth.uid() = user_id);

create policy "Admins can update all expenses"
  on project_expenses for update
  using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid()
      and role in ('admin', 'finance', 'supervisor')
    )
  );

-- Add triggers for updated_at
create extension if not exists moddatetime schema extensions;

create trigger handle_updated_at before update on project_expenses
  for each row execute procedure moddatetime (updated_at);

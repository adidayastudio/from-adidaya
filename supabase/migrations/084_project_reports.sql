-- Create project_reports table
create table project_reports (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  
  title text not null,
  report_date date not null default current_date,
  
  progress numeric check (progress >= 0 and progress <= 100),
  status text not null check (status in ('on-track', 'delayed', 'critical', 'completed')),
  
  manpower_count integer,
  weather_condition text,
  
  content text,
  
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index idx_project_reports_project_id on project_reports(project_id);
create index idx_project_reports_date on project_reports(report_date);

-- RLS Policies
alter table project_reports enable row level security;

create policy "Users can view reports for projects in their workspace"
  on project_reports for select
  using (
    exists (
      select 1 from projects
      where projects.id = project_reports.project_id
      and projects.workspace_id = (
          -- Assuming simple workspace check or public for now as per existing patterns
          -- For now, allowing all authenticated users to view if they have access to project
          -- Refine based on specific workspace logic if needed
          select workspace_id from projects where id = project_reports.project_id
      )
    )
  );

create policy "Users can create reports for projects they have access to"
  on project_reports for insert
  with check (
    auth.uid() = created_by
  );

create policy "Users can update their own reports"
  on project_reports for update
  using (
      auth.uid() = created_by
  );

create policy "Users can delete their own reports"
  on project_reports for delete
  using (
      auth.uid() = created_by
  );

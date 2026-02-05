-- Drop existing policies to recreate them safely
drop policy if exists "Users can view reports for projects in their workspace" on project_reports;
drop policy if exists "Users can create reports for projects they have access to" on project_reports;
drop policy if exists "Users can update their own reports" on project_reports;
drop policy if exists "Users can delete their own reports" on project_reports;

-- Simplified RLS Policies matching existing project patterns
-- View: Allow if user has access to the project (via workspace)
create policy "Users can view reports for projects in their workspace"
  on project_reports for select
  using (
    exists (
      select 1 from projects
      join workspace_members on projects.workspace_id = workspace_members.workspace_id
      where projects.id = project_reports.project_id
      and workspace_members.user_id = auth.uid()
    )
  );

-- Create: Allow if user is a member of the workspace
create policy "Users can create reports for projects they have access to"
  on project_reports for insert
  with check (
    exists (
      select 1 from projects
      join workspace_members on projects.workspace_id = workspace_members.workspace_id
      where projects.id = project_reports.project_id
      and workspace_members.user_id = auth.uid()
    )
  );

-- Update: Allow if user is creator OR has admin/owner role in workspace
create policy "Users can update usage reports"
  on project_reports for update
  using (
    auth.uid() = created_by OR
    exists (
      select 1 from projects
      join workspace_members on projects.workspace_id = workspace_members.workspace_id
      where projects.id = project_reports.project_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('owner', 'admin')
    )
  );

-- Delete: Allow if user is creator OR has admin/owner role
create policy "Users can delete usage reports"
  on project_reports for delete
  using (
    auth.uid() = created_by OR
    exists (
      select 1 from projects
      join workspace_members on projects.workspace_id = workspace_members.workspace_id
      where projects.id = project_reports.project_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('owner', 'admin')
    )
  );

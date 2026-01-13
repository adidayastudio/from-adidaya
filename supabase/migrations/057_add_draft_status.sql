-- Add 'Draft' to the check constraint for status in project_expenses
alter table project_expenses drop constraint project_expenses_status_check;

alter table project_expenses add constraint project_expenses_status_check 
check (status in ('Draft', 'Pending', 'Approved', 'Rejected', 'Paid'));

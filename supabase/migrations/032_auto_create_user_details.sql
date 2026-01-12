-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- 1. Create Profile
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    split_part(new.email, '@', 1), -- Default username from email
    split_part(new.email, '@', 1), -- Default full_name from email
    ''
  );

  -- 2. Assign Default Role (staff)
  -- Insert into user_roles safely (do nothing if exists)
  insert into public.user_roles (user_id, role)
  values (new.id, 'staff')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function after a new user is created in auth.users
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();

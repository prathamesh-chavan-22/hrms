-- Block client-side HR+ updates to privileged profile columns.
-- Privileged changes must go through service-role server actions.

create or replace function protect_profile_privileged_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Service role / migrations: no session user
  if auth.uid() is null then
    return new;
  end if;

  -- All authenticated users: preserve HR-managed fields
  new.role := old.role;
  new.tenant_id := old.tenant_id;
  new.status := old.status;
  new.email := old.email;
  new.employee_code := old.employee_code;
  new.department := old.department;
  new.designation := old.designation;
  new.date_of_joining := old.date_of_joining;
  new.must_change_password := old.must_change_password;

  return new;
end;
$$;

drop policy if exists "profiles: hr+ can manage" on profiles;

create policy "profiles: hr+ can view" on profiles
  for select using (tenant_id = auth_tenant_id() and auth_role() in ('owner', 'hr', 'admin'));

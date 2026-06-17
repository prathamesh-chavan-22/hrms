-- Prevent privilege escalation via profiles self-update RLS policy.
-- Employees may only change personal fields (full_name, phone, avatar_url).
-- Privileged columns require hr+ (profiles: hr+ can manage policy).

create or replace function protect_profile_privileged_columns()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  caller_role user_role;
begin
  -- Service role / migrations: no session user
  if auth.uid() is null then
    return new;
  end if;

  select role into caller_role from public.profiles where id = auth.uid();

  if caller_role in ('owner', 'hr', 'admin') then
    return new;
  end if;

  -- Self-update by employee: preserve HR-managed fields
  if auth.uid() = old.id then
    new.role := old.role;
    new.tenant_id := old.tenant_id;
    new.status := old.status;
    new.email := old.email;
    new.employee_code := old.employee_code;
    new.department := old.department;
    new.designation := old.designation;
    new.date_of_joining := old.date_of_joining;
  end if;

  return new;
end;
$$;

create trigger trg_protect_profile_privileged_columns
  before update on profiles
  for each row execute function protect_profile_privileged_columns();

drop policy if exists "profiles: self can update" on profiles;

create policy "profiles: self can update" on profiles
  for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
    and tenant_id = (select p.tenant_id from public.profiles p where p.id = auth.uid())
    and status = (select p.status from public.profiles p where p.id = auth.uid())
    and email = (select p.email from public.profiles p where p.id = auth.uid())
  );

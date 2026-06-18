-- Password management: first-login change flag + reset request escalation

alter table profiles
  add column if not exists must_change_password boolean not null default false;

create type password_reset_escalation as enum ('super_admin', 'company_admin');

create table password_reset_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  tenant_id   uuid references tenants(id) on delete cascade,
  email       text not null,
  escalation  password_reset_escalation not null,
  status      text not null default 'pending' check (status in ('pending', 'resolved', 'cancelled')),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

create index password_reset_requests_user_idx on password_reset_requests(user_id);
create index password_reset_requests_tenant_idx on password_reset_requests(tenant_id);

alter table password_reset_requests enable row level security;

-- Only service role creates reset requests (forgot-password flow); hr+ can view tenant requests
create policy "password_reset_requests: hr+ can view tenant" on password_reset_requests
  for select using (
    tenant_id = auth_tenant_id()
    and auth_role() in ('owner', 'admin')
  );

-- Employees cannot self-clear must_change_password via RLS self-update
create or replace function protect_profile_privileged_columns()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  caller_role user_role;
begin
  if auth.uid() is null then
    return new;
  end if;

  select role into caller_role from public.profiles where id = auth.uid();

  if caller_role in ('owner', 'hr', 'admin') then
    return new;
  end if;

  if auth.uid() = old.id then
    new.role := old.role;
    new.tenant_id := old.tenant_id;
    new.status := old.status;
    new.email := old.email;
    new.employee_code := old.employee_code;
    new.department := old.department;
    new.designation := old.designation;
    new.date_of_joining := old.date_of_joining;
    new.must_change_password := old.must_change_password;
  end if;

  return new;
end;
$$;

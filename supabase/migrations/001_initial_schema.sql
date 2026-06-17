-- ============================================================
-- Glacia HRMS - Initial Schema
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────
create extension if not exists "pgcrypto" with schema extensions;

-- ─── Enums ───────────────────────────────────────────────────
create type plan_type as enum ('starter', 'plus', 'pro');
create type user_role as enum ('owner', 'hr', 'admin', 'employee');
create type employee_status as enum ('active', 'inactive', 'invited');
create type leave_type_code as enum ('EL', 'CL', 'SL', 'ML', 'PL', 'LWP', 'COMP', 'BL', 'OL');
create type holiday_type as enum ('national', 'optional', 'company');
create type leave_status as enum ('pending', 'approved', 'rejected', 'cancelled');
create type attend_status as enum ('present', 'half_day', 'absent', 'wfh');

-- ─── Tenants ─────────────────────────────────────────────────
create table tenants (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null check (slug ~ '^[a-z0-9][a-z0-9\-]{1,30}[a-z0-9]$'),
  name          text not null,
  logo_url      text,
  plan          plan_type not null default 'starter',
  gps_required  boolean not null default true,
  theme         jsonb not null default '{"accent":"#38bdf8","accentDark":"#0ea5e9"}',
  owner_id      uuid,
  created_at    timestamptz not null default now()
);

-- ─── Profiles (1:1 with auth.users) ──────────────────────────
create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  tenant_id       uuid not null references tenants(id) on delete cascade,
  role            user_role not null default 'employee',
  full_name       text not null,
  email           text not null,
  employee_code   text,
  phone           text,
  department      text,
  designation     text,
  date_of_joining date,
  status          employee_status not null default 'active',
  avatar_url      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index profiles_tenant_id_idx on profiles(tenant_id);
create index profiles_email_idx on profiles(email);

-- back-fill owner_id after profile insert
create or replace function set_tenant_owner()
returns trigger language plpgsql security definer as $$
begin
  if new.role in ('owner') then
    update tenants set owner_id = new.id where id = new.tenant_id and owner_id is null;
  end if;
  return new;
end;
$$;

create trigger trg_set_tenant_owner
  after insert on profiles
  for each row execute function set_tenant_owner();

-- auto-update updated_at
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function touch_updated_at();

-- ─── Invites ─────────────────────────────────────────────────
create table invites (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  email       text not null,
  role        user_role not null default 'employee',
  token       text unique not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  invited_by  uuid references profiles(id) on delete set null,
  expires_at  timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);

create index invites_token_idx on invites(token);
create index invites_tenant_id_idx on invites(tenant_id);

-- ─── Leave Types ──────────────────────────────────────────────
create table leave_types (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  name            text not null,
  code            text not null,
  days_per_year   int not null default 0,
  carry_forward   boolean not null default false,
  carry_forward_max int,
  encashable      boolean not null default false,
  requires_doc    boolean not null default false,
  doc_after_days  int,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  unique (tenant_id, code)
);

create index leave_types_tenant_idx on leave_types(tenant_id);

-- ─── Holidays ────────────────────────────────────────────────
create table holidays (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  name        text not null,
  date        date not null,
  type        holiday_type not null default 'company',
  description text,
  created_at  timestamptz not null default now(),
  unique (tenant_id, date, name)
);

create index holidays_tenant_idx on holidays(tenant_id);
create index holidays_date_idx on holidays(tenant_id, date);

-- ─── Leave Requests ──────────────────────────────────────────
create table leave_requests (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  leave_type_id   uuid not null references leave_types(id),
  start_date      date not null,
  end_date        date not null,
  total_days      numeric(4,1) not null,
  reason          text,
  status          leave_status not null default 'pending',
  reviewed_by     uuid references profiles(id),
  reviewed_at     timestamptz,
  review_note     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index leave_requests_tenant_idx on leave_requests(tenant_id);
create index leave_requests_user_idx on leave_requests(user_id);

create trigger trg_leave_requests_updated_at
  before update on leave_requests
  for each row execute function touch_updated_at();

-- ─── Attendance ──────────────────────────────────────────────
create table attendance (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  date            date not null,
  punch_in_at     timestamptz,
  punch_in_lat    double precision,
  punch_in_lng    double precision,
  punch_in_addr   text,
  punch_out_at    timestamptz,
  punch_out_lat   double precision,
  punch_out_lng   double precision,
  punch_out_addr  text,
  status          attend_status not null default 'present',
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (tenant_id, user_id, date)
);

create index attendance_tenant_idx on attendance(tenant_id);
create index attendance_user_idx on attendance(user_id);
create index attendance_date_idx on attendance(tenant_id, date);

create trigger trg_attendance_updated_at
  before update on attendance
  for each row execute function touch_updated_at();

-- ─── Chatbot Intents ─────────────────────────────────────────
create table chatbot_intents (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid references tenants(id) on delete cascade,
  patterns    text[] not null,
  response    text not null,
  query_type  text,
  is_global   boolean not null default false,
  priority    int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index chatbot_intents_tenant_idx on chatbot_intents(tenant_id);

-- ─── RLS ─────────────────────────────────────────────────────
alter table tenants enable row level security;
alter table profiles enable row level security;
alter table invites enable row level security;
alter table leave_types enable row level security;
alter table holidays enable row level security;
alter table leave_requests enable row level security;
alter table attendance enable row level security;
alter table chatbot_intents enable row level security;

-- Helper: get caller's tenant_id from their profile
create or replace function auth_tenant_id()
returns uuid language sql stable security definer as $$
  select tenant_id from profiles where id = auth.uid()
$$;

-- Helper: get caller's role
create or replace function auth_role()
returns user_role language sql stable security definer as $$
  select role from profiles where id = auth.uid()
$$;

-- tenants: visible to members; updatable by owner/hr/admin
create policy "tenants: members can view" on tenants
  for select using (id = auth_tenant_id());

create policy "tenants: hr+ can update" on tenants
  for update using (id = auth_tenant_id() and auth_role() in ('owner','hr','admin'));

-- profiles: tenant-scoped select; self-update; hr+ insert/update others
create policy "profiles: tenant members can view" on profiles
  for select using (tenant_id = auth_tenant_id());

create policy "profiles: self can update" on profiles
  for update using (id = auth.uid());

create policy "profiles: hr+ can manage" on profiles
  for all using (tenant_id = auth_tenant_id() and auth_role() in ('owner','hr','admin'));

-- invites: hr+ can manage; anyone can read their own token (handled by service role)
create policy "invites: hr+ can manage" on invites
  for all using (tenant_id = auth_tenant_id() and auth_role() in ('owner','hr','admin'));

-- leave_types: all can read; hr+ can write
create policy "leave_types: members read" on leave_types
  for select using (tenant_id = auth_tenant_id());

create policy "leave_types: hr+ write" on leave_types
  for all using (tenant_id = auth_tenant_id() and auth_role() in ('owner','hr','admin'));

-- holidays: same
create policy "holidays: members read" on holidays
  for select using (tenant_id = auth_tenant_id());

create policy "holidays: hr+ write" on holidays
  for all using (tenant_id = auth_tenant_id() and auth_role() in ('owner','hr','admin'));

-- leave_requests: self read/insert; hr+ full
create policy "leave_requests: self read" on leave_requests
  for select using (tenant_id = auth_tenant_id() and (user_id = auth.uid() or auth_role() in ('owner','hr','admin')));

create policy "leave_requests: self insert" on leave_requests
  for insert with check (tenant_id = auth_tenant_id() and user_id = auth.uid());

create policy "leave_requests: hr+ update" on leave_requests
  for update using (tenant_id = auth_tenant_id() and auth_role() in ('owner','hr','admin'));

-- attendance: same pattern
create policy "attendance: self read" on attendance
  for select using (tenant_id = auth_tenant_id() and (user_id = auth.uid() or auth_role() in ('owner','hr','admin')));

create policy "attendance: self upsert" on attendance
  for all using (tenant_id = auth_tenant_id() and (user_id = auth.uid() or auth_role() in ('owner','hr','admin')));

-- chatbot: global intents readable by all, tenant intents scoped
create policy "chatbot: read" on chatbot_intents
  for select using (is_global = true or tenant_id = auth_tenant_id());

create policy "chatbot: hr+ write" on chatbot_intents
  for all using (tenant_id = auth_tenant_id() and auth_role() in ('owner','hr','admin'));

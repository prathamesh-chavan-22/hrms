-- Company account requests (superadmin approval required before tenant creation)

create type company_request_status as enum ('pending', 'approved', 'rejected');

create table company_requests (
  id             uuid primary key default gen_random_uuid(),
  company_name   text not null,
  slug           text not null,
  owner_name     text not null,
  owner_email    text not null,
  status         company_request_status not null default 'pending',
  rejection_note text,
  tenant_id      uuid references tenants(id) on delete set null,
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now()
);

create unique index company_requests_pending_slug_idx
  on company_requests (slug) where status = 'pending';

create unique index company_requests_pending_email_idx
  on company_requests (owner_email) where status = 'pending';

-- Service-role only; all access via server-side service client
alter table company_requests enable row level security;

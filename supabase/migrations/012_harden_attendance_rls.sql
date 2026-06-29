-- Harden attendance RLS: split FOR ALL policy, block employee DELETE,
-- and protect privileged columns via trigger (mirrors profiles 004/007).

create or replace function protect_attendance_privileged_columns()
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

  if tg_op = 'INSERT' then
    new.status := 'present';
    new.punch_in_at := now();
    new.note := null;
    new.punch_out_at := null;
    new.punch_out_lat := null;
    new.punch_out_lng := null;
    new.punch_out_addr := null;
    return new;
  end if;

  -- Employee UPDATE: only punch-out fields may change after punch-in
  new.tenant_id := old.tenant_id;
  new.user_id := old.user_id;
  new.date := old.date;
  new.status := old.status;
  new.note := old.note;
  new.punch_in_at := old.punch_in_at;
  new.punch_in_lat := old.punch_in_lat;
  new.punch_in_lng := old.punch_in_lng;
  new.punch_in_addr := old.punch_in_addr;

  if old.punch_in_at is null or old.punch_out_at is not null then
    new.punch_out_at := old.punch_out_at;
    new.punch_out_lat := old.punch_out_lat;
    new.punch_out_lng := old.punch_out_lng;
    new.punch_out_addr := old.punch_out_addr;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_attendance_privileged_columns on attendance;

create trigger trg_protect_attendance_privileged_columns
  before insert or update on attendance
  for each row execute function protect_attendance_privileged_columns();

drop policy if exists "attendance: self upsert" on attendance;

create policy "attendance: self insert" on attendance
  for insert with check (
    tenant_id = auth_tenant_id()
    and user_id = auth.uid()
    and auth_role() not in ('owner', 'hr', 'admin')
  );

create policy "attendance: self update" on attendance
  for update using (
    tenant_id = auth_tenant_id()
    and user_id = auth.uid()
    and auth_role() not in ('owner', 'hr', 'admin')
  );

create policy "attendance: hr+ manage" on attendance
  for all using (
    tenant_id = auth_tenant_id()
    and auth_role() in ('owner', 'hr', 'admin')
  );

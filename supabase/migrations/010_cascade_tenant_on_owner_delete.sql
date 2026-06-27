-- Migration 010: Cascade tenant deletion on owner profile delete
create or replace function public.handle_profile_delete_cascade_tenant()
returns trigger as $$
begin
  delete from public.tenants
  where owner_id = old.id;
  return old;
end;
$$ language plpgsql security definer;

create trigger trg_handle_profile_delete_cascade_tenant
  after delete on public.profiles
  for each row
  execute function public.handle_profile_delete_cascade_tenant();

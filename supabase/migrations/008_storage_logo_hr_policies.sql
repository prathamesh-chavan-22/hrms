-- Enforce hr+ role on tenant logo storage mutations (not just tenant folder match).

drop policy if exists "logos: hr+ upload" on storage.objects;
drop policy if exists "logos: hr+ update" on storage.objects;
drop policy if exists "logos: hr+ delete" on storage.objects;

create policy "logos: hr+ upload"
  on storage.objects for insert
  with check (
    bucket_id = 'tenant-logos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth_tenant_id()::text
    and auth_role() in ('owner', 'hr', 'admin')
  );

create policy "logos: hr+ update"
  on storage.objects for update
  using (
    bucket_id = 'tenant-logos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth_tenant_id()::text
    and auth_role() in ('owner', 'hr', 'admin')
  );

create policy "logos: hr+ delete"
  on storage.objects for delete
  using (
    bucket_id = 'tenant-logos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth_tenant_id()::text
    and auth_role() in ('owner', 'hr', 'admin')
  );

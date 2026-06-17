-- ============================================================
-- Glacia HRMS - Storage bucket for tenant logos
-- ============================================================

-- Run via Supabase dashboard: Storage > Create bucket
-- OR via supabase-js with service role. SQL below creates the bucket policy.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tenant-logos',
  'tenant-logos',
  true,
  2097152,  -- 2 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do nothing;

-- Storage policies
create policy "logos: public read"
  on storage.objects for select
  using (bucket_id = 'tenant-logos');

create policy "logos: hr+ upload"
  on storage.objects for insert
  with check (
    bucket_id = 'tenant-logos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth_tenant_id()::text
  );

create policy "logos: hr+ update"
  on storage.objects for update
  using (
    bucket_id = 'tenant-logos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth_tenant_id()::text
  );

create policy "logos: hr+ delete"
  on storage.objects for delete
  using (
    bucket_id = 'tenant-logos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth_tenant_id()::text
  );

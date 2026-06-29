-- Remove SVG from tenant logo bucket allowlist (XSS surface on public bucket).
update storage.buckets
set allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp']
where id = 'tenant-logos';

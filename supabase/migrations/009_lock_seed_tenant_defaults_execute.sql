-- Restrict seed_tenant_defaults to service role only.
-- SECURITY DEFINER functions are executable by PUBLIC by default.

revoke execute on function public.seed_tenant_defaults(uuid) from public;
revoke execute on function public.seed_tenant_defaults(uuid) from anon, authenticated;
grant execute on function public.seed_tenant_defaults(uuid) to service_role;

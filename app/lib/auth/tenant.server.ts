import { createSupabaseServiceClient } from "../supabase.server";

export async function createTenantWithOwner(
  env: Env,
  params: {
    companyName: string;
    slug: string;
    ownerEmail: string;
    ownerName: string;
    password: string;
  }
) {
  const service = createSupabaseServiceClient(env);

  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email: params.ownerEmail,
    password: params.password,
    email_confirm: true,
    user_metadata: { full_name: params.ownerName },
  });

  if (authError || !authData.user) {
    return { error: authError?.message ?? "Failed to create user" };
  }

  const { data: tenant, error: tenantError } = await service
    .from("tenants")
    .insert({
      slug: params.slug,
      name: params.companyName,
    })
    .select()
    .single();

  if (tenantError || !tenant) {
    await service.auth.admin.deleteUser(authData.user.id);
    return { error: tenantError?.message ?? "Failed to create company" };
  }

  const { error: profileError } = await service.from("profiles").insert({
    id: authData.user.id,
    tenant_id: tenant.id,
    role: "owner",
    full_name: params.ownerName,
    email: params.ownerEmail,
  });

  if (profileError) {
    await service.auth.admin.deleteUser(authData.user.id);
    return { error: profileError.message };
  }

  await service.rpc("seed_tenant_defaults", { p_tenant_id: tenant.id });

  return { tenant, userId: authData.user.id };
}

import { createSupabaseServiceClient } from "../supabase.server";

export async function resetEmployeePassword(
  env: Env,
  params: { userId: string; tenantId: string; newPassword: string }
) {
  const service = createSupabaseServiceClient(env);

  const { data: profile } = await service
    .from("profiles")
    .select("id, role")
    .eq("id", params.userId)
    .eq("tenant_id", params.tenantId)
    .single();

  if (!profile) return { error: "Employee not found" };
  if (profile.role === "owner") return { error: "Cannot reset the company owner's password from here" };

  const { error: authError } = await service.auth.admin.updateUserById(params.userId, {
    password: params.newPassword,
  });

  if (authError) return { error: authError.message };

  const { error: profileError } = await service
    .from("profiles")
    .update({ must_change_password: true })
    .eq("id", params.userId);

  if (profileError) return { error: profileError.message };

  return { success: true };
}

export async function completeFirstLoginPasswordChange(
  env: Env,
  userId: string,
  newPassword: string
) {
  const service = createSupabaseServiceClient(env);

  const { error: authError } = await service.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (authError) return { error: authError.message };

  const { error: profileError } = await service
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", userId);

  if (profileError) return { error: profileError.message };

  return { success: true };
}

export async function submitPasswordResetRequest(env: Env, email: string) {
  const service = createSupabaseServiceClient(env);

  const { data: profile } = await service
    .from("profiles")
    .select("id, role, full_name, email, tenant_id, tenant:tenants(name, slug)")
    .eq("email", email)
    .single();

  if (!profile) {
    return { success: true, escalated: null as null };
  }

  const isOwner = profile.role === "owner";
  const escalation = isOwner ? "super_admin" : "company_admin";

  await service.from("password_reset_requests").insert({
    user_id: profile.id,
    tenant_id: profile.tenant_id,
    email: profile.email,
    escalation,
  });

  return {
    success: true,
    escalated: escalation,
    profile: profile as {
      id: string;
      role: string;
      full_name: string;
      email: string;
      tenant_id: string;
      tenant: { name: string; slug: string } | null;
    },
  };
}

import { redirect } from "react-router";
import { createSupabaseServerClient, createSupabaseServiceClient } from "./supabase.server";
import type { Profile, Tenant } from "~/types/app";
import { isHR } from "~/lib/roles";
import { canAddEmployee } from "~/lib/plans";

export async function getSession(request: Request, env: Env) {
  const { supabase, cookies } = createSupabaseServerClient(request, env);
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, cookies, user };
}

export async function requireUser(request: Request, env: Env) {
  const { supabase, cookies, user } = await getSession(request, env);
  if (!user) throw redirect("/login");
  return { supabase, cookies, user };
}

export async function requireProfile(request: Request, env: Env): Promise<{
  profile: Profile;
  tenant: Tenant;
  cookies: { name: string; value: string }[];
}> {
  const { supabase, cookies, user } = await requireUser(request, env);

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, tenant:tenants(*)")
    .eq("id", user.id)
    .single();

  if (!profile) throw redirect("/login");

  return {
    profile: profile as Profile,
    tenant: (profile as unknown as { tenant: Tenant }).tenant,
    cookies,
  };
}

export async function requireTenantAccess(
  request: Request,
  env: Env,
  slug: string
): Promise<{ profile: Profile; tenant: Tenant; cookies: { name: string; value: string }[] }> {
  const { profile, tenant, cookies } = await requireProfile(request, env);

  if (tenant.slug !== slug) {
    throw redirect(`/${tenant.slug}/dashboard`);
  }

  return { profile, tenant, cookies };
}

export async function requireHR(request: Request, env: Env, slug: string) {
  const result = await requireTenantAccess(request, env, slug);
  if (!isHR(result.profile.role)) {
    throw redirect(`/${slug}/dashboard`);
  }
  return result;
}

/**
 * Lightweight auth for child route loaders. Validates the session and fetches
 * only the fields needed to scope DB queries (tenant_id, user id, role). The
 * full profile and tenant objects are provided by the layout loader via outlet
 * context, so child loaders should not re-fetch them.
 */
export async function requireChildLoaderAuth(request: Request, env: Env) {
  const { supabase, cookies } = createSupabaseServerClient(request, env);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw redirect("/login");

  const { data: row } = await supabase
    .from("profiles")
    .select("id, role, tenant_id")
    .eq("id", user.id)
    .single();

  if (!row) throw redirect("/login");

  return { userId: user.id as string, tenantId: row.tenant_id as string, role: row.role as string, supabase, cookies };
}

export async function resolveRedirectAfterLogin(request: Request, env: Env) {
  const { supabase, cookies, user } = await getSession(request, env);
  if (!user) return { user: null, cookies, redirectTo: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("must_change_password, tenant:tenants(slug)")
    .eq("id", user.id)
    .single();

  if (!profile) return { user, cookies, redirectTo: null };
  const tenant = (profile as unknown as { tenant: { slug: string } | null }).tenant;
  const redirectTo = getLoginRedirect({
    must_change_password: profile.must_change_password,
    tenant,
  });
  return { user, cookies, redirectTo };
}

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

  // Create auth user
  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email: params.ownerEmail,
    password: params.password,
    email_confirm: true,
    user_metadata: { full_name: params.ownerName },
  });

  if (authError || !authData.user) {
    return { error: authError?.message ?? "Failed to create user" };
  }

  // Create tenant
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

  // Create owner profile
  const { error: profileError } = await service
    .from("profiles")
    .insert({
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

  // Seed default leave types and holidays
  await service.rpc("seed_tenant_defaults", { p_tenant_id: tenant.id });

  return { tenant, userId: authData.user.id };
}

export async function getInviteByToken(env: Env, token: string) {
  const service = createSupabaseServiceClient(env);
  const { data } = await service
    .from("invites")
    .select("*, tenant:tenants(slug, name, plan)")
    .eq("token", token)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();
  return data;
}

export async function acceptInvite(
  env: Env,
  token: string,
  params: { fullName: string; password: string }
) {
  const service = createSupabaseServiceClient(env);

  const invite = await getInviteByToken(env, token);
  if (!invite) return { error: "Invalid or expired invite link" };

  // Enforce plan cap at acceptance time to handle queued-invite bypass.
  const tenantPlan = (invite.tenant as { plan: string } | null)?.plan ?? "starter";
  const { count } = await service
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", invite.tenant_id);
  if (!canAddEmployee(tenantPlan, count ?? 0)) {
    return { error: "This company has reached its plan limit. Contact the HR admin." };
  }

  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email: invite.email,
    password: params.password,
    email_confirm: true,
    user_metadata: { full_name: params.fullName },
  });

  if (authError || !authData.user) {
    return { error: authError?.message ?? "Failed to create account" };
  }

  const { error: profileError } = await service.from("profiles").insert({
    id: authData.user.id,
    tenant_id: invite.tenant_id,
    role: invite.role,
    full_name: params.fullName,
    email: invite.email,
    status: "active",
  });

  if (profileError) {
    await service.auth.admin.deleteUser(authData.user.id);
    return { error: profileError.message };
  }

  const { error: inviteError } = await service
    .from("invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("token", token);

  if (inviteError) {
    console.error("[acceptInvite] Failed to mark invite accepted:", inviteError);
  }

  return { success: true, email: invite.email };
}

export async function createEmployeeAccount(
  env: Env,
  params: {
    tenantId: string;
    email: string;
    fullName: string;
    role: string;
    password: string;
    tenantPlan: string;
  }
) {
  const service = createSupabaseServiceClient(env);

  const { count } = await service
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", params.tenantId);

  if (!canAddEmployee(params.tenantPlan, count ?? 0)) {
    return { error: "This company has reached its plan limit." };
  }

  const { data: existing } = await service
    .from("profiles")
    .select("id")
    .eq("tenant_id", params.tenantId)
    .eq("email", params.email)
    .single();

  if (existing) return { error: "This email is already a team member" };

  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true,
    user_metadata: { full_name: params.fullName },
  });

  if (authError || !authData.user) {
    return { error: authError?.message ?? "Failed to create account" };
  }

  const { error: profileError } = await service.from("profiles").insert({
    id: authData.user.id,
    tenant_id: params.tenantId,
    role: params.role,
    full_name: params.fullName,
    email: params.email,
    status: "active",
    must_change_password: true,
  });

  if (profileError) {
    await service.auth.admin.deleteUser(authData.user.id);
    return { error: profileError.message };
  }

  return { success: true, userId: authData.user.id };
}

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
    // Always succeed silently to avoid email enumeration
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

export function getLoginRedirect(profile: {
  must_change_password?: boolean;
  tenant?: { slug: string } | null;
} | null): string | null {
  if (!profile) return null;
  if (profile.must_change_password) return "/change-password";
  const slug = profile.tenant?.slug;
  return slug ? `/${slug}/dashboard` : null;
}

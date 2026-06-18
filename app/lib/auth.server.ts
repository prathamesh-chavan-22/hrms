import { redirect } from "react-router";
import { createSupabaseServerClient, createSupabaseServiceClient } from "./supabase.server";
import type { Profile, Tenant, UserRole } from "~/types/app";
import { isHR, isInvitableRole } from "~/lib/roles";
import { canAddEmployee } from "~/lib/plans";

const SLUG_REGEX = /^[a-z0-9][a-z0-9\-]{1,30}[a-z0-9]$/;

export function isSuperAdminEmail(email: string | undefined, env: Env): boolean {
  if (!email || !env.SUPER_ADMIN_EMAIL) return false;
  return email.toLowerCase() === env.SUPER_ADMIN_EMAIL.toLowerCase();
}

export function getSuperAdminRedirect(email: string | undefined, env: Env): string | null {
  return isSuperAdminEmail(email, env) ? "/admin/company-requests" : null;
}

export function generateTempPassword(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
}

export async function requireSuperAdmin(request: Request, env: Env) {
  const { user, cookies } = await requireUser(request, env);
  if (!isSuperAdminEmail(user.email, env)) {
    throw redirect("/login");
  }
  return { user, cookies };
}

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

  if (!profile) {
    const superAdminRedirect = getSuperAdminRedirect(user.email, env);
    if (superAdminRedirect) return { user, cookies, redirectTo: superAdminRedirect };
    return { user, cookies, redirectTo: null };
  }

  const superAdminRedirect = getSuperAdminRedirect(user.email, env);
  if (superAdminRedirect) return { user, cookies, redirectTo: superAdminRedirect };

  const tenant = (profile as unknown as { tenant: { slug: string } | null }).tenant;
  const redirectTo = getLoginRedirect({
    must_change_password: profile.must_change_password,
    tenant,
  }, env, user.email);
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

export async function validateCompanyRequest(
  env: Env,
  params: { companyName: string; slug: string; ownerName: string; ownerEmail: string },
  options?: { excludeRequestId?: string }
): Promise<Record<string, string>> {
  const errors: Record<string, string> = {};
  const service = createSupabaseServiceClient(env);

  if (!params.companyName) errors.companyName = "Company name is required";
  if (!params.slug) errors.slug = "Slug is required";
  else if (!SLUG_REGEX.test(params.slug))
    errors.slug = "Slug must be 3-32 chars, lowercase letters, numbers and hyphens only";
  if (!params.ownerName) errors.ownerName = "Your name is required";
  if (!params.ownerEmail) errors.ownerEmail = "Email is required";

  if (Object.keys(errors).length > 0) return errors;

  let pendingSlugQuery = service
    .from("company_requests")
    .select("id")
    .eq("slug", params.slug)
    .eq("status", "pending");
  let pendingEmailQuery = service
    .from("company_requests")
    .select("id")
    .eq("owner_email", params.ownerEmail)
    .eq("status", "pending");

  if (options?.excludeRequestId) {
    pendingSlugQuery = pendingSlugQuery.neq("id", options.excludeRequestId);
    pendingEmailQuery = pendingEmailQuery.neq("id", options.excludeRequestId);
  }

  const [{ data: existingTenant }, { data: pendingSlug }, { data: pendingEmail }] = await Promise.all([
    service.from("tenants").select("id").eq("slug", params.slug).maybeSingle(),
    pendingSlugQuery.maybeSingle(),
    pendingEmailQuery.maybeSingle(),
  ]);

  if (existingTenant) errors.slug = "This company URL is already taken";
  else if (pendingSlug) errors.slug = "A pending request already uses this URL";
  if (pendingEmail) errors.ownerEmail = "A pending request already exists for this email";

  return errors;
}

export async function submitCompanyRequest(
  env: Env,
  params: { companyName: string; slug: string; ownerName: string; ownerEmail: string }
) {
  const errors = await validateCompanyRequest(env, params);
  if (Object.keys(errors).length > 0) return { errors };

  const service = createSupabaseServiceClient(env);
  const { error } = await service.from("company_requests").insert({
    company_name: params.companyName,
    slug: params.slug,
    owner_name: params.ownerName,
    owner_email: params.ownerEmail,
    status: "pending",
  });

  if (error) return { errors: { form: error.message } };
  return { success: true };
}

export async function approveCompanyRequest(env: Env, requestId: string) {
  const service = createSupabaseServiceClient(env);

  const { data: request } = await service
    .from("company_requests")
    .select("*")
    .eq("id", requestId)
    .eq("status", "pending")
    .single();

  if (!request) return { error: "Request not found or already reviewed" };

  const validationErrors = await validateCompanyRequest(env, {
    companyName: request.company_name,
    slug: request.slug,
    ownerName: request.owner_name,
    ownerEmail: request.owner_email,
  }, { excludeRequestId: requestId });

  if (validationErrors.slug || validationErrors.ownerEmail) {
    return { error: validationErrors.slug ?? validationErrors.ownerEmail ?? "Request is no longer valid" };
  }

  const tempPassword = generateTempPassword();
  const result = await createTenantWithOwner(env, {
    companyName: request.company_name,
    slug: request.slug,
    ownerEmail: request.owner_email,
    ownerName: request.owner_name,
    password: tempPassword,
  });

  if (result.error) return { error: result.error };

  await service
    .from("profiles")
    .update({ must_change_password: true })
    .eq("id", result.userId!);

  const { error: updateError } = await service
    .from("company_requests")
    .update({
      status: "approved",
      tenant_id: result.tenant!.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "pending");

  if (updateError) return { error: updateError.message };

  return {
    success: true,
    request,
    tenant: result.tenant,
  };
}

export async function rejectCompanyRequest(
  env: Env,
  requestId: string,
  rejectionNote?: string
) {
  const service = createSupabaseServiceClient(env);

  const { data: request, error } = await service
    .from("company_requests")
    .update({
      status: "rejected",
      rejection_note: rejectionNote?.trim() || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "pending")
    .select()
    .single();

  if (error || !request) return { error: "Request not found or already reviewed" };
  return { success: true, request };
}

async function countTenantSeats(service: ReturnType<typeof createSupabaseServiceClient>, tenantId: string) {
  const now = new Date().toISOString();
  const [{ count: profileCount }, { count: inviteCount }] = await Promise.all([
    service
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    service
      .from("invites")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .is("accepted_at", null)
      .gt("expires_at", now),
  ]);
  return (profileCount ?? 0) + (inviteCount ?? 0);
}

export async function createInvite(
  env: Env,
  params: {
    tenantId: string;
    email: string;
    role: UserRole;
    invitedById: string;
    inviterRole: UserRole;
    tenantPlan: string;
  }
) {
  if (!isInvitableRole(params.role, params.inviterRole)) {
    return { error: "Invalid role" };
  }

  const service = createSupabaseServiceClient(env);
  const email = params.email.trim().toLowerCase();

  const seatCount = await countTenantSeats(service, params.tenantId);
  if (!canAddEmployee(params.tenantPlan, seatCount)) {
    return { error: "This company has reached its plan limit." };
  }

  const [{ data: existingProfile }, { data: pendingInvite }] = await Promise.all([
    service
      .from("profiles")
      .select("id")
      .eq("tenant_id", params.tenantId)
      .eq("email", email)
      .maybeSingle(),
    service
      .from("invites")
      .select("id")
      .eq("tenant_id", params.tenantId)
      .eq("email", email)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle(),
  ]);

  if (existingProfile) return { error: "This email is already a team member" };
  if (pendingInvite) return { error: "A pending invite already exists for this email" };

  const { data: invite, error } = await service
    .from("invites")
    .insert({
      tenant_id: params.tenantId,
      email,
      role: params.role,
      invited_by: params.invitedById,
    })
    .select()
    .single();

  if (error || !invite) return { error: error?.message ?? "Failed to create invite" };
  return { success: true, invite };
}

export async function resendInvite(
  env: Env,
  params: { inviteId: string; tenantId: string }
) {
  const service = createSupabaseServiceClient(env);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: invite, error } = await service
    .from("invites")
    .update({ expires_at: expiresAt })
    .eq("id", params.inviteId)
    .eq("tenant_id", params.tenantId)
    .is("accepted_at", null)
    .select()
    .single();

  if (error || !invite) return { error: "Invite not found or already accepted" };
  return { success: true, invite };
}

export async function revokeInvite(
  env: Env,
  params: { inviteId: string; tenantId: string }
) {
  const service = createSupabaseServiceClient(env);
  const { error } = await service
    .from("invites")
    .delete()
    .eq("id", params.inviteId)
    .eq("tenant_id", params.tenantId)
    .is("accepted_at", null);

  if (error) return { error: error.message };
  return { success: true };
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
} | null, env?: Env, email?: string): string | null {
  if (env && email) {
    const superAdminRedirect = getSuperAdminRedirect(email, env);
    if (superAdminRedirect) return superAdminRedirect;
  }
  if (!profile) return null;
  if (profile.must_change_password) return "/change-password";
  const slug = profile.tenant?.slug;
  return slug ? `/${slug}/dashboard` : null;
}

import { createSupabaseServiceClient } from "../supabase.server";
import type { UserRole } from "~/types/app";
import { isInvitableRole } from "~/lib/roles";
import { canAddEmployee } from "~/lib/plans";
import { logServerError } from "../logging.server";

async function countTenantSeats(
  service: ReturnType<typeof createSupabaseServiceClient>,
  tenantId: string
) {
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
    logServerError("acceptInvite", "Failed to mark invite accepted", inviteError);
  }

  return { success: true, email: invite.email };
}

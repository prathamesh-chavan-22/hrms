import type { IntentHandler } from "../intent-handler.server";
import { actionSuccess, actionError } from "../action-result";
import { requireHR } from "~/lib/auth/guards.server";
import {
  createInvite,
  resendInvite,
  revokeInvite,
} from "~/lib/auth/invites.server";
import { resetEmployeePassword } from "~/lib/auth/passwords.server";
import { sendInviteEmail } from "~/lib/email.server";
import { fireAndForgetEmail } from "~/lib/email/send-async.server";
import { setEmployeeStatus } from "~/lib/services/employees.service";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { getLowercaseEmail, getString } from "~/lib/validation/form-data";
import { validatePassword } from "~/lib/validation/password";
import { isInvitableRole, canResetPassword } from "~/lib/roles";
import type { UserRole } from "~/types/app";

async function getHRContext(ctx: Parameters<IntentHandler>[0]) {
  const slug = ctx.params.slug!;
  const { profile, tenant } = await requireHR(ctx.request, ctx.env, slug);
  const { supabase } = createSupabaseServerClient(ctx.request, ctx.env);
  return { slug, profile, tenant, supabase };
}

export const inviteHandler: IntentHandler = async (ctx) => {
  const intent = "invite";
  const { profile, tenant } = await getHRContext(ctx);
  const email = getLowercaseEmail(ctx.form, "email");
  const rawRole = getString(ctx.form, "role", "employee");

  if (!isInvitableRole(rawRole, profile.role)) {
    return actionError("Invalid role", intent, 403);
  }
  if (!email) return actionError("Email is required", intent);

  const result = await createInvite(ctx.env, {
    tenantId: tenant.id,
    email,
    role: rawRole as UserRole,
    invitedById: profile.id,
    inviterRole: profile.role,
    tenantPlan: tenant.plan,
  });

  if (result.error) return actionError(result.error, intent);

  fireAndForgetEmail(
    sendInviteEmail(ctx.env, {
      to: email,
      invitedByName: profile.full_name,
      companyName: tenant.name,
      role: rawRole,
      inviteToken: result.invite!.token,
    }),
    "invite",
    { email },
    ctx.waitUntil
  );

  return actionSuccess(`Invitation sent to ${email}`, intent);
};

export const resendInviteHandler: IntentHandler = async (ctx) => {
  const intent = "resend_invite";
  const { profile, tenant } = await getHRContext(ctx);
  const inviteId = getString(ctx.form, "inviteId");

  const result = await resendInvite(ctx.env, { inviteId, tenantId: tenant.id });
  if (result.error) return actionError(result.error, intent);

  const invite = result.invite!;
  fireAndForgetEmail(
    sendInviteEmail(ctx.env, {
      to: invite.email,
      invitedByName: profile.full_name,
      companyName: tenant.name,
      role: invite.role,
      inviteToken: invite.token,
    }),
    "invite_resend",
    { email: invite.email },
    ctx.waitUntil
  );

  return actionSuccess(`Invitation resent to ${invite.email}`, intent);
};

export const revokeInviteHandler: IntentHandler = async (ctx) => {
  const intent = "revoke_invite";
  const { tenant } = await getHRContext(ctx);
  const inviteId = getString(ctx.form, "inviteId");

  const result = await revokeInvite(ctx.env, { inviteId, tenantId: tenant.id });
  if (result.error) return actionError(result.error, intent);
  return actionSuccess("Invitation revoked", intent);
};

export const resetPasswordHandler: IntentHandler = async (ctx) => {
  const intent = "reset_password";
  const { profile, tenant } = await getHRContext(ctx);

  if (!canResetPassword(profile.role)) {
    return actionError("Only owner and admin can reset passwords", intent, 403);
  }

  const userId = getString(ctx.form, "userId");
  const newPassword = getString(ctx.form, "newPassword");

  if (userId === profile.id) {
    return actionError("Use account settings to change your own password", intent);
  }

  const passwordError = validatePassword(newPassword);
  if (passwordError) return actionError(passwordError, intent);

  const result = await resetEmployeePassword(ctx.env, {
    userId,
    tenantId: tenant.id,
    newPassword,
  });

  if (result.error) return actionError(result.error, intent);
  return actionSuccess("Password reset. Employee must change it on next login.", intent);
};

export const deactivateHandler: IntentHandler = async (ctx) => {
  const intent = "deactivate";
  const { profile, tenant } = await getHRContext(ctx);
  const userId = getString(ctx.form, "userId");

  if (userId === profile.id) return actionError("Cannot deactivate yourself", intent);
  const result = await setEmployeeStatus(ctx.env, {
    userId,
    tenantId: tenant.id,
    status: "inactive",
  });
  if (result.error) return actionError(result.error, intent, 500);
  return actionSuccess("Employee deactivated", intent);
};

export const activateHandler: IntentHandler = async (ctx) => {
  const intent = "activate";
  const { tenant } = await getHRContext(ctx);
  const userId = getString(ctx.form, "userId");

  const result = await setEmployeeStatus(ctx.env, {
    userId,
    tenantId: tenant.id,
    status: "active",
  });
  if (result.error) return actionError(result.error, intent, 500);
  return actionSuccess("Employee activated", intent);
};

export const employeeIntentHandlers: Record<string, IntentHandler> = {
  invite: inviteHandler,
  resend_invite: resendInviteHandler,
  revoke_invite: revokeInviteHandler,
  reset_password: resetPasswordHandler,
  deactivate: deactivateHandler,
  activate: activateHandler,
};

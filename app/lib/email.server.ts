import { Resend } from "resend";
import { escapeHtml } from "~/lib/format";
import { renderEmailHtml } from "~/lib/email/templates";
import { logEmailFailure } from "~/lib/logging.server";

export function getResendClient(env: Env) {
  return new Resend(env.RESEND_API_KEY);
}

async function sendEmail(
  env: Env,
  params: { to: string | string[]; subject: string; html: string },
  emailType: string
) {
  const resend = getResendClient(env);
  const { error } = await resend.emails.send({
    from: "Glacia HRMS <noreply@glacia.supernovae.me>",
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  if (error) {
    logEmailFailure(emailType, error);
    return { error: error.message };
  }
  return { success: true };
}

export async function sendInviteEmail(
  env: Env,
  params: {
    to: string;
    invitedByName: string;
    companyName: string;
    role: string;
    inviteToken: string;
  }
) {
  const inviteUrl = `${env.APP_BASE_URL}/invite/${params.inviteToken}`;
  const safeInvitedBy = escapeHtml(params.invitedByName);
  const safeCompany = escapeHtml(params.companyName);
  const safeRole = escapeHtml(params.role);

  return sendEmail(
    env,
    {
      to: params.to,
      subject: `You're invited to join ${safeCompany} on Glacia`,
      html: renderEmailHtml({
        title: "You've been invited!",
        bodyHtml: `
    <p><strong>${safeInvitedBy}</strong> has invited you to join <strong>${safeCompany}</strong> on Glacia HRMS.</p>
    <span class="role-badge">${safeRole}</span>
    <br />`,
        cta: { label: "Accept Invitation", href: inviteUrl },
        footerNote: "This link expires in 7 days. If you didn't expect this invite, you can ignore this email.",
      }),
    },
    "invite"
  );
}

export async function sendWelcomeEmail(
  env: Env,
  params: { to: string; name: string; companyName: string; slug: string }
) {
  const safeName = escapeHtml(params.name);
  const safeCompany = escapeHtml(params.companyName);
  const dashboardUrl = `${env.APP_BASE_URL}/${escapeHtml(params.slug)}/dashboard`;

  return sendEmail(
    env,
    {
      to: params.to,
      subject: `Welcome to Glacia — ${safeCompany} is live!`,
      html: renderEmailHtml({
        title: `Welcome, ${safeName}!`,
        bodyHtml: `<p>Your company <strong>${safeCompany}</strong> is now live on Glacia. Start adding your team and setting up your HR policies.</p>`,
        cta: { label: "Go to Dashboard", href: dashboardUrl },
      }),
    },
    "welcome"
  );
}

export async function sendCompanyRequestConfirmationEmail(
  env: Env,
  params: { to: string; ownerName: string; companyName: string }
) {
  const safeName = escapeHtml(params.ownerName);
  const safeCompany = escapeHtml(params.companyName);

  return sendEmail(
    env,
    {
      to: params.to,
      subject: "We received your company account request",
      html: renderEmailHtml({
        title: "Request received",
        bodyHtml: `
  <p>Hi ${safeName},</p>
  <p>We've received your request to create <strong>${safeCompany}</strong> on Glacia HRMS. Our team will review it and email you when your account is approved.</p>`,
        footerNote: "You don't need to take any further action right now.",
        styled: false,
      }),
    },
    "company_request_confirmation"
  );
}

export async function sendCompanyRequestSuperAdminEmail(
  env: Env,
  params: {
    companyName: string;
    slug: string;
    ownerName: string;
    ownerEmail: string;
  }
) {
  if (!env.SUPER_ADMIN_EMAIL) return { success: false };

  const adminUrl = `${env.APP_BASE_URL}/admin/company-requests`;
  const safeCompany = escapeHtml(params.companyName);
  const safeSlug = escapeHtml(params.slug);
  const safeName = escapeHtml(params.ownerName);
  const safeEmail = escapeHtml(params.ownerEmail);

  return sendEmail(
    env,
    {
      to: env.SUPER_ADMIN_EMAIL,
      subject: `[Action required] New company request — ${safeCompany}`,
      html: renderEmailHtml({
        title: "New company account request",
        bodyHtml: `
  <p><strong>Company:</strong> ${safeCompany}</p>
  <p><strong>Slug:</strong> ${safeSlug}</p>
  <p><strong>Owner:</strong> ${safeName} (${safeEmail})</p>`,
        cta: { label: "Review pending requests", href: adminUrl },
        styled: false,
      }),
    },
    "company_request_superadmin"
  );
}

export async function sendCompanyApprovedEmail(
  env: Env,
  params: { to: string; ownerName: string; companyName: string; slug: string }
) {
  const loginUrl = `${env.APP_BASE_URL}/login`;
  const safeName = escapeHtml(params.ownerName);
  const safeCompany = escapeHtml(params.companyName);

  return sendEmail(
    env,
    {
      to: params.to,
      subject: `Your ${safeCompany} account has been approved`,
      html: renderEmailHtml({
        title: "You're approved!",
        bodyHtml: `
  <p>Hi ${safeName},</p>
  <p>Your company account for <strong>${safeCompany}</strong> has been approved. Sign in with the email address you provided. You'll be asked to set a new password on first login.</p>`,
        cta: { label: "Sign in to Glacia", href: loginUrl },
        styled: false,
      }),
    },
    "company_approved"
  );
}

export async function sendCompanyRejectedEmail(
  env: Env,
  params: { to: string; ownerName: string; companyName: string; note?: string | null }
) {
  const safeName = escapeHtml(params.ownerName);
  const safeCompany = escapeHtml(params.companyName);
  const noteBlock = params.note
    ? `<p><strong>Note:</strong> ${escapeHtml(params.note)}</p>`
    : "";

  return sendEmail(
    env,
    {
      to: params.to,
      subject: `Update on your ${safeCompany} request`,
      html: renderEmailHtml({
        title: "Request not approved",
        bodyHtml: `
  <p>Hi ${safeName},</p>
  <p>We're unable to approve your request for <strong>${safeCompany}</strong> at this time.</p>
  ${noteBlock}
  <p>If you have questions, reply to this email or contact support.</p>`,
        styled: false,
      }),
    },
    "company_rejected"
  );
}

export async function sendPasswordResetEscalationEmail(
  env: Env,
  params: {
    to: string | string[];
    userName: string;
    userEmail: string;
    companyName: string | null;
    escalation: "super_admin" | "company_admin";
  }
) {
  const safeName = escapeHtml(params.userName);
  const safeEmail = escapeHtml(params.userEmail);
  const safeCompany = params.companyName ? escapeHtml(params.companyName) : "N/A";

  const subject =
    params.escalation === "super_admin"
      ? `[Super Admin] Password reset requested — company owner ${safeEmail}`
      : `[Company Admin] Password reset requested — ${safeEmail}`;

  const intro =
    params.escalation === "super_admin"
      ? `<p><strong>${safeName}</strong> (${safeEmail}), the company owner of <strong>${safeCompany}</strong>, requested a password reset from the login screen. This request is escalated to <strong>Super Admin</strong>.</p>`
      : `<p><strong>${safeName}</strong> (${safeEmail}) at <strong>${safeCompany}</strong> requested a password reset from the login screen. As owner or admin, please set a new temporary password for this user from the Employees page.</p>`;

  return sendEmail(
    env,
    {
      to: params.to,
      subject,
      html: renderEmailHtml({
        title: "Password Reset Request",
        bodyHtml: `${intro}`,
        footerNote: `Requested at ${new Date().toISOString()}`,
        styled: false,
      }),
    },
    "password_reset_escalation"
  );
}

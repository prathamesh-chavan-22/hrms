import { Resend } from "resend";
import { escapeHtml } from "~/lib/format";

export function getResendClient(env: Env) {
  return new Resend(env.RESEND_API_KEY);
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
  const resend = getResendClient(env);
  const inviteUrl = `${env.APP_BASE_URL}/invite/${params.inviteToken}`;

  const safeInvitedBy = escapeHtml(params.invitedByName);
  const safeCompany = escapeHtml(params.companyName);
  const safeRole = escapeHtml(params.role);

  const { error } = await resend.emails.send({
    from: "Glacia HRMS <noreply@glacia.supernovae.me>",
    to: params.to,
    subject: `You're invited to join ${safeCompany} on Glacia`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f0f9ff; margin: 0; padding: 40px 20px; }
    .card { background: #fff; border-radius: 16px; max-width: 520px; margin: 0 auto; padding: 40px; box-shadow: 0 4px 24px rgba(14,165,233,0.08); }
    .logo { font-size: 28px; font-weight: 800; color: #0ea5e9; letter-spacing: -0.5px; margin-bottom: 32px; }
    h1 { font-size: 22px; color: #0f172a; margin: 0 0 16px; }
    p { color: #475569; line-height: 1.6; margin: 0 0 24px; }
    .btn { display: inline-block; background: linear-gradient(135deg,#38bdf8,#0ea5e9); color: #fff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px; }
    .footer { margin-top: 40px; font-size: 13px; color: #94a3b8; }
    .role-badge { display: inline-block; background: #e0f2fe; color: #0284c7; padding: 4px 12px; border-radius: 999px; font-size: 13px; font-weight: 500; margin-bottom: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">❄ Glacia</div>
    <h1>You've been invited!</h1>
    <p><strong>${safeInvitedBy}</strong> has invited you to join <strong>${safeCompany}</strong> on Glacia HRMS.</p>
    <span class="role-badge">${safeRole}</span>
    <br />
    <a href="${inviteUrl}" class="btn">Accept Invitation</a>
    <p style="margin-top:24px;font-size:13px;color:#94a3b8;">This link expires in 7 days. If you didn't expect this invite, you can ignore this email.</p>
    <div class="footer">© ${new Date().getFullYear()} Glacia HRMS &mdash; Powered by Supernovae</div>
  </div>
</body>
</html>`,
  });

  if (error) {
    console.error("[Resend] Failed to send invite:", error);
    return { error: error.message };
  }

  return { success: true };
}

export async function sendWelcomeEmail(
  env: Env,
  params: { to: string; name: string; companyName: string; slug: string }
) {
  const resend = getResendClient(env);
  const safeName = escapeHtml(params.name);
  const safeCompany = escapeHtml(params.companyName);
  const dashboardUrl = `${env.APP_BASE_URL}/${escapeHtml(params.slug)}/dashboard`;

  const { error } = await resend.emails.send({
    from: "Glacia HRMS <noreply@glacia.supernovae.me>",
    to: params.to,
    subject: `Welcome to Glacia — ${safeCompany} is live!`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f0f9ff; margin: 0; padding: 40px 20px; }
    .card { background: #fff; border-radius: 16px; max-width: 520px; margin: 0 auto; padding: 40px; box-shadow: 0 4px 24px rgba(14,165,233,0.08); }
    .logo { font-size: 28px; font-weight: 800; color: #0ea5e9; letter-spacing: -0.5px; margin-bottom: 32px; }
    h1 { font-size: 22px; color: #0f172a; margin: 0 0 16px; }
    p { color: #475569; line-height: 1.6; margin: 0 0 24px; }
    .btn { display: inline-block; background: linear-gradient(135deg,#38bdf8,#0ea5e9); color: #fff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px; }
    .footer { margin-top: 40px; font-size: 13px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">❄ Glacia</div>
    <h1>Welcome, ${safeName}!</h1>
    <p>Your company <strong>${safeCompany}</strong> is now live on Glacia. Start adding your team and setting up your HR policies.</p>
    <a href="${dashboardUrl}" class="btn">Go to Dashboard</a>
    <div class="footer">© ${new Date().getFullYear()} Glacia HRMS &mdash; Powered by Supernovae</div>
  </div>
</body>
</html>`,
  });

  if (error) console.error("[Resend] Welcome email failed:", error);
  return { success: !error };
}

export async function sendCompanyRequestConfirmationEmail(
  env: Env,
  params: { to: string; ownerName: string; companyName: string }
) {
  const resend = getResendClient(env);
  const safeName = escapeHtml(params.ownerName);
  const safeCompany = escapeHtml(params.companyName);

  const { error } = await resend.emails.send({
    from: "Glacia HRMS <noreply@glacia.supernovae.me>",
    to: params.to,
    subject: "We received your company account request",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: sans-serif; color: #334155; line-height: 1.6;">
  <h2>Request received</h2>
  <p>Hi ${safeName},</p>
  <p>We've received your request to create <strong>${safeCompany}</strong> on Glacia HRMS. Our team will review it and email you when your account is approved.</p>
  <p style="color:#64748b;font-size:13px;">You don't need to take any further action right now.</p>
</body>
</html>`,
  });

  if (error) console.error("[Resend] Company request confirmation failed:", error);
  return { success: !error };
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

  const resend = getResendClient(env);
  const adminUrl = `${env.APP_BASE_URL}/admin/company-requests`;
  const safeCompany = escapeHtml(params.companyName);
  const safeSlug = escapeHtml(params.slug);
  const safeName = escapeHtml(params.ownerName);
  const safeEmail = escapeHtml(params.ownerEmail);

  const { error } = await resend.emails.send({
    from: "Glacia HRMS <noreply@glacia.supernovae.me>",
    to: env.SUPER_ADMIN_EMAIL,
    subject: `[Action required] New company request — ${safeCompany}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: sans-serif; color: #334155; line-height: 1.6;">
  <h2>New company account request</h2>
  <p><strong>Company:</strong> ${safeCompany}</p>
  <p><strong>Slug:</strong> ${safeSlug}</p>
  <p><strong>Owner:</strong> ${safeName} (${safeEmail})</p>
  <p><a href="${adminUrl}">Review pending requests</a></p>
</body>
</html>`,
  });

  if (error) console.error("[Resend] Superadmin company request alert failed:", error);
  return { success: !error };
}

export async function sendCompanyApprovedEmail(
  env: Env,
  params: { to: string; ownerName: string; companyName: string; slug: string }
) {
  const resend = getResendClient(env);
  const loginUrl = `${env.APP_BASE_URL}/login`;
  const safeName = escapeHtml(params.ownerName);
  const safeCompany = escapeHtml(params.companyName);

  const { error } = await resend.emails.send({
    from: "Glacia HRMS <noreply@glacia.supernovae.me>",
    to: params.to,
    subject: `Your ${safeCompany} account has been approved`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: sans-serif; color: #334155; line-height: 1.6;">
  <h2>You're approved!</h2>
  <p>Hi ${safeName},</p>
  <p>Your company account for <strong>${safeCompany}</strong> has been approved. Sign in with the email address you provided. You'll be asked to set a new password on first login.</p>
  <p><a href="${loginUrl}">Sign in to Glacia</a></p>
</body>
</html>`,
  });

  if (error) console.error("[Resend] Company approved email failed:", error);
  return { success: !error };
}

export async function sendCompanyRejectedEmail(
  env: Env,
  params: { to: string; ownerName: string; companyName: string; note?: string | null }
) {
  const resend = getResendClient(env);
  const safeName = escapeHtml(params.ownerName);
  const safeCompany = escapeHtml(params.companyName);
  const noteBlock = params.note
    ? `<p><strong>Note:</strong> ${escapeHtml(params.note)}</p>`
    : "";

  const { error } = await resend.emails.send({
    from: "Glacia HRMS <noreply@glacia.supernovae.me>",
    to: params.to,
    subject: `Update on your ${safeCompany} request`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: sans-serif; color: #334155; line-height: 1.6;">
  <h2>Request not approved</h2>
  <p>Hi ${safeName},</p>
  <p>We're unable to approve your request for <strong>${safeCompany}</strong> at this time.</p>
  ${noteBlock}
  <p>If you have questions, reply to this email or contact support.</p>
</body>
</html>`,
  });

  if (error) console.error("[Resend] Company rejected email failed:", error);
  return { success: !error };
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
  const resend = getResendClient(env);
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

  const { error } = await resend.emails.send({
    from: "Glacia HRMS <noreply@glacia.supernovae.me>",
    to: params.to,
    subject,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: sans-serif; color: #334155; line-height: 1.6;">
  <h2>Password Reset Request</h2>
  ${intro}
  <p style="color:#64748b;font-size:13px;">Requested at ${new Date().toISOString()}</p>
</body>
</html>`,
  });

  if (error) console.error("[Resend] Password reset escalation email failed:", error);
  return { success: !error };
}

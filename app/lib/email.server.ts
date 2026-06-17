import { Resend } from "resend";

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

  const { error } = await resend.emails.send({
    from: "Glacia HRMS <noreply@glacia.supernovae.me>",
    to: params.to,
    subject: `You're invited to join ${params.companyName} on Glacia`,
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
    <p><strong>${params.invitedByName}</strong> has invited you to join <strong>${params.companyName}</strong> on Glacia HRMS.</p>
    <span class="role-badge">${params.role}</span>
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
  const dashboardUrl = `${env.APP_BASE_URL}/${params.slug}/dashboard`;

  const { error } = await resend.emails.send({
    from: "Glacia HRMS <noreply@glacia.supernovae.me>",
    to: params.to,
    subject: `Welcome to Glacia — ${params.companyName} is live!`,
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
    <h1>Welcome, ${params.name}!</h1>
    <p>Your company <strong>${params.companyName}</strong> is now live on Glacia. Start adding your team and setting up your HR policies.</p>
    <a href="${dashboardUrl}" class="btn">Go to Dashboard</a>
    <div class="footer">© ${new Date().getFullYear()} Glacia HRMS &mdash; Powered by Supernovae</div>
  </div>
</body>
</html>`,
  });

  if (error) console.error("[Resend] Welcome email failed:", error);
  return { success: !error };
}

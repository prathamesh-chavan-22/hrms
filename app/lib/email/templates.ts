import { escapeHtml } from "~/lib/format";

export interface EmailShellParams {
  title: string;
  bodyHtml: string;
  cta?: { label: string; href: string };
  footerNote?: string;
  styled?: boolean;
}

const STYLED_SHELL = `
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
    <h1>{{TITLE}}</h1>
    {{BODY}}
    {{CTA}}
    {{FOOTER_NOTE}}
    <div class="footer">© ${new Date().getFullYear()} Glacia HRMS &mdash; Powered by Supernovae</div>
  </div>
</body>
</html>`;

const PLAIN_SHELL = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: sans-serif; color: #334155; line-height: 1.6;">
  <h2>{{TITLE}}</h2>
  {{BODY}}
  {{CTA}}
  {{FOOTER_NOTE}}
</body>
</html>`;

export function renderEmailHtml(params: EmailShellParams): string {
  const shell = params.styled !== false ? STYLED_SHELL : PLAIN_SHELL;
  const ctaBlock = params.cta
    ? params.styled !== false
      ? `<a href="${params.cta.href}" class="btn">${escapeHtml(params.cta.label)}</a>`
      : `<p><a href="${params.cta.href}">${escapeHtml(params.cta.label)}</a></p>`
    : "";
  const footerNote = params.footerNote
    ? params.styled !== false
      ? `<p style="margin-top:24px;font-size:13px;color:#94a3b8;">${params.footerNote}</p>`
      : `<p style="color:#64748b;font-size:13px;">${params.footerNote}</p>`
    : "";

  return shell
    .replace("{{TITLE}}", escapeHtml(params.title))
    .replace("{{BODY}}", params.bodyHtml)
    .replace("{{CTA}}", ctaBlock)
    .replace("{{FOOTER_NOTE}}", footerNote);
}

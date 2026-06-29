import { data, Form, useActionData, useNavigation, Link } from "react-router";
import type { Route } from "./+types/forgot-password";
import { createSupabaseServiceClient } from "~/lib/supabase.server";
import { submitPasswordResetRequest } from "~/lib/auth.server";
import { enforceRateLimit, clientIpKey } from "~/lib/rate-limit.server";
import { sendPasswordResetEscalationEmail } from "~/lib/email.server";
import { GlaciaLogo } from "~/components/GlaciaLogo";
import { FormField } from "~/components/FormField";
import { Button } from "~/components/Button";
import { IcyCard, IcyCardBody } from "~/components/IcyCard";

export function meta() {
  return [{ title: "Forgot Password — Glacia HRMS" }];
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    return data({ error: "Email is required", submitted: false }, { status: 400 });
  }

  await enforceRateLimit(request, env, {
    endpoint: "forgot-password",
    limit: 5,
    windowSeconds: 60 * 60,
    keys: [clientIpKey(request), email],
  });

  const result = await submitPasswordResetRequest(env, email);

  if (result.profile && result.escalated) {
    const { profile, escalated } = result;

    if (escalated === "super_admin") {
      if (env.SUPER_ADMIN_EMAIL) {
        await sendPasswordResetEscalationEmail(env, {
          to: env.SUPER_ADMIN_EMAIL,
          userName: profile.full_name,
          userEmail: profile.email,
          companyName: profile.tenant?.name ?? null,
          escalation: "super_admin",
        });
      }
    } else {
      const service = createSupabaseServiceClient(env);
      const { data: admins } = await service
        .from("profiles")
        .select("email")
        .eq("tenant_id", profile.tenant_id)
        .in("role", ["owner", "admin"])
        .eq("status", "active");

      const recipients = (admins ?? []).map((a) => a.email).filter(Boolean);
      if (recipients.length > 0) {
        await sendPasswordResetEscalationEmail(env, {
          to: recipients,
          userName: profile.full_name,
          userEmail: profile.email,
          companyName: profile.tenant?.name ?? null,
          escalation: "company_admin",
        });
      }
    }
  }

  return data({
    submitted: true,
    error: null,
    message:
      "If an account exists for that email, your request has been sent to the appropriate administrator.",
  });
}

export default function ForgotPasswordPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        <div className="mb-8">
          <Link to="/" className="inline-block">
            <GlaciaLogo size="lg" />
          </Link>
          <p className="eyebrow mt-4">FORGOT PASSWORD</p>
        </div>

        <IcyCard className="hard-shadow">
          <IcyCardBody className="p-8">
            {actionData?.submitted ? (
              <div className="space-y-5">
                <div className="bevel p-4 text-sm" style={{ borderColor: "var(--ok)" }}>
                  <p className="eyebrow mb-1" style={{ color: "var(--ok)" }}>REQUEST SENT</p>
                  {actionData.message}
                </div>
                <p className="text-sm text-ink-2">
                  Company owner accounts are escalated to Super Admin. All other accounts are handled by your company owner or admin.
                </p>
                <Link
                  to="/login"
                  className="font-mono font-bold text-accent-dark hover:underline uppercase text-xs tracking-wide"
                >
                  ← Back to sign in
                </Link>
              </div>
            ) : (
              <>
                {actionData?.error && (
                  <div className="bevel-sunken mb-5 p-4 text-sm font-mono text-err">
                    {actionData.error}
                  </div>
                )}

                <p className="text-sm text-ink-2 mb-5">
                  Enter your work email. Your request will be routed to Super Admin (company owners) or your company administrator (everyone else).
                </p>

                <Form method="post" className="space-y-5">
                  <FormField
                    label="Work Email"
                    name="email"
                    type="email"
                    placeholder="you@company.com"
                    required
                    autoComplete="email"
                  />

                  <Button type="submit" fullWidth loading={isSubmitting} size="lg">
                    Submit Request
                  </Button>
                </Form>

                <p className="mt-6 text-sm text-ink-2">
                  <Link to="/login" className="font-mono font-bold text-accent-dark hover:underline uppercase text-xs tracking-wide">
                    ← Back to sign in
                  </Link>
                </p>
              </>
            )}
          </IcyCardBody>
        </IcyCard>
      </div>
    </div>
  );
}

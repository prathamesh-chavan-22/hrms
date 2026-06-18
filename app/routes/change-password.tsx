import { data, redirect, Form, useActionData, useNavigation, Link } from "react-router";
import type { Route } from "./+types/change-password";
import { requireUser, completeFirstLoginPasswordChange, getLoginRedirect } from "~/lib/auth.server";
import { appendCookieHeaders } from "~/lib/supabase.server";
import { GlaciaLogo } from "~/components/GlaciaLogo";
import { FormField } from "~/components/FormField";
import { Button } from "~/components/Button";
import { IcyCard, IcyCardBody } from "~/components/IcyCard";
import { getString } from "~/lib/validation/form-data";
import { validatePasswordConfirmation } from "~/lib/validation/password";

export function meta() {
  return [{ title: "Change Password — Glacia HRMS" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const { supabase, user } = await requireUser(request, env);

  const { data: profile } = await supabase
    .from("profiles")
    .select("must_change_password, tenant:tenants(slug)")
    .eq("id", user.id)
    .single();

  if (!profile?.must_change_password) {
    const redirectTo = getLoginRedirect({
      must_change_password: false,
      tenant: (profile as unknown as { tenant: { slug: string } | null })?.tenant,
    });
    throw redirect(redirectTo ?? "/login");
  }

  return null;
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const { supabase, cookies, user } = await requireUser(request, env);
  const form = await request.formData();

  const newPassword = getString(form, "newPassword");
  const confirmPassword = getString(form, "confirmPassword");

  const errors: Record<string, string> = {};
  const passwordError = validatePasswordConfirmation(newPassword, confirmPassword);
  if (passwordError) {
    if (passwordError.includes("match")) errors.confirmPassword = passwordError;
    else errors.newPassword = passwordError;
  }

  if (Object.keys(errors).length > 0) {
    return data({ errors }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("must_change_password, tenant:tenants(slug)")
    .eq("id", user.id)
    .single();

  if (!profile?.must_change_password) {
    throw redirect(getLoginRedirect({ must_change_password: false, tenant: (profile as unknown as { tenant: { slug: string } | null })?.tenant }) ?? "/login");
  }

  const result = await completeFirstLoginPasswordChange(env, user.id, newPassword);
  if (result.error) {
    return data({ errors: { form: result.error } }, { status: 400 });
  }

  const slug = (profile as unknown as { tenant: { slug: string } | null }).tenant?.slug;
  const headers = appendCookieHeaders(new Headers(), cookies);
  headers.set("Location", slug ? `/${slug}/dashboard` : "/login");
  return new Response(null, { status: 302, headers });
}

export default function ChangePasswordPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const errors = actionData?.errors ?? {};

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        <div className="mb-8">
          <Link to="/" className="inline-block">
            <GlaciaLogo size="lg" />
          </Link>
          <p className="eyebrow mt-4">SET YOUR NEW PASSWORD</p>
        </div>

        <div className="bevel mb-5 p-4 text-sm" style={{ borderColor: "var(--warn)" }}>
          <p className="eyebrow mb-1" style={{ color: "var(--warn)" }}>FIRST LOGIN</p>
          You must choose a new password before continuing.
        </div>

        <IcyCard className="hard-shadow">
          <IcyCardBody className="p-8">
            {errors.form && (
              <div className="bevel-sunken mb-5 p-4 text-sm font-mono text-err">
                {errors.form}
              </div>
            )}

            <Form method="post" className="space-y-5">
              <FormField
                label="New Password"
                name="newPassword"
                type="password"
                placeholder="At least 8 characters"
                required
                error={errors.newPassword}
                autoComplete="new-password"
              />

              <FormField
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                placeholder="Repeat new password"
                required
                error={errors.confirmPassword}
                autoComplete="new-password"
              />

              <Button type="submit" fullWidth loading={isSubmitting} size="lg">
                Save & Continue
              </Button>
            </Form>
          </IcyCardBody>
        </IcyCard>
      </div>
    </div>
  );
}

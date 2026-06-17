import { data, redirect, Form, useActionData, useNavigation, Link } from "react-router";
import type { Route } from "./+types/signup";
import { createTenantWithOwner } from "~/lib/auth.server";
import { sendWelcomeEmail } from "~/lib/email.server";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { GlaciaLogo } from "~/components/GlaciaLogo";
import { FormField } from "~/components/FormField";
import { Button } from "~/components/Button";
import { IcyCard, IcyCardBody } from "~/components/IcyCard";

export function meta() {
  return [{ title: "Sign Up — Glacia HRMS" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { supabase } = createSupabaseServerClient(request, context.cloudflare.env);
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return redirect("/login");
  return null;
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const form = await request.formData();

  const companyName = String(form.get("companyName") ?? "").trim();
  const slug = String(form.get("slug") ?? "").trim().toLowerCase();
  const ownerName = String(form.get("ownerName") ?? "").trim();
  const ownerEmail = String(form.get("ownerEmail") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const confirmPassword = String(form.get("confirmPassword") ?? "");

  const errors: Record<string, string> = {};

  if (!companyName) errors.companyName = "Company name is required";
  if (!slug) errors.slug = "Slug is required";
  else if (!/^[a-z0-9][a-z0-9\-]{1,30}[a-z0-9]$/.test(slug))
    errors.slug = "Slug must be 3-32 chars, lowercase letters, numbers and hyphens only";
  if (!ownerName) errors.ownerName = "Your name is required";
  if (!ownerEmail) errors.ownerEmail = "Email is required";
  if (password.length < 8) errors.password = "Password must be at least 8 characters";
  if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match";

  if (Object.keys(errors).length > 0) {
    return data({ errors, values: { companyName, slug, ownerName, ownerEmail } }, { status: 400 });
  }

  const result = await createTenantWithOwner(env, {
    companyName,
    slug,
    ownerEmail,
    ownerName,
    password,
  });

  if (result.error) {
    return data({ errors: { form: result.error }, values: { companyName, slug, ownerName, ownerEmail } }, { status: 400 });
  }

  // Send welcome email (non-blocking)
  sendWelcomeEmail(env, {
    to: ownerEmail,
    name: ownerName,
    companyName,
    slug,
  }).catch(console.error);

  // Redirect to login so they can authenticate
  return redirect(`/login?welcome=1&slug=${slug}`);
}

export default function SignupPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const errors = actionData?.errors ?? {};
  const values = actionData?.values ?? {};

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4 py-10">
      <div className="relative w-full max-w-lg">
        <div className="mb-8">
          <Link to="/" className="inline-block">
            <GlaciaLogo size="lg" />
          </Link>
          <p className="eyebrow mt-4">CREATE YOUR COMPANY ACCOUNT</p>
        </div>

        <IcyCard className="hard-shadow">
          <IcyCardBody className="p-8">
            {errors.form && (
              <div className="bevel-sunken mb-6 p-4 text-sm font-mono text-err">
                {errors.form}
              </div>
            )}

            <Form method="post" className="space-y-5">
              <div>
                <h2 className="font-mono font-bold text-sm uppercase tracking-[0.06em] text-ink">Company Details</h2>
                <p className="eyebrow mt-1">CREATES YOUR DEDICATED HRMS WORKSPACE</p>
              </div>

              <FormField
                label="Company Name"
                name="companyName"
                placeholder="Nova Technologies"
                required
                defaultValue={values.companyName}
                error={errors.companyName}
              />

              <FormField
                label="Company URL Slug"
                name="slug"
                placeholder="nova"
                required
                defaultValue={values.slug}
                error={errors.slug}
                hint="glacia.supernovae.me/nova — lowercase, letters, numbers, hyphens"
              />

              <div className="rule-solid pt-5">
                <h2 className="font-mono font-bold text-sm uppercase tracking-[0.06em] text-ink">Your Account</h2>
                <p className="eyebrow mt-1">YOU WILL BE THE OWNER</p>
              </div>

              <FormField
                label="Full Name"
                name="ownerName"
                placeholder="Arjun Sharma"
                required
                defaultValue={values.ownerName}
                error={errors.ownerName}
              />

              <FormField
                label="Work Email"
                name="ownerEmail"
                type="email"
                placeholder="arjun@nova.in"
                required
                defaultValue={values.ownerEmail}
                error={errors.ownerEmail}
                autoComplete="email"
              />

              <FormField
                label="Password"
                name="password"
                type="password"
                placeholder="Min. 8 characters"
                required
                error={errors.password}
                autoComplete="new-password"
              />

              <FormField
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                placeholder="Repeat password"
                required
                error={errors.confirmPassword}
                autoComplete="new-password"
              />

              <Button type="submit" fullWidth loading={isSubmitting} size="lg" className="mt-2">
                Create Company Account
              </Button>
            </Form>

            <p className="mt-6 text-sm text-ink-2">
              Already have an account?{" "}
              <Link to="/login" className="font-mono font-bold text-accent-dark hover:underline uppercase text-xs tracking-wide">
                Sign in →
              </Link>
            </p>
          </IcyCardBody>
        </IcyCard>

        <p className="eyebrow mt-6">BY SIGNING UP YOU AGREE TO OUR TERMS & PRIVACY POLICY</p>
      </div>
    </div>
  );
}

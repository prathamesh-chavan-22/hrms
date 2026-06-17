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
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-cyan-50 flex items-center justify-center p-4">
      {/* Frost blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-cyan-200/30 blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <GlaciaLogo size="lg" />
          </Link>
          <p className="mt-3 text-slate-500 text-sm">Create your company account</p>
        </div>

        <IcyCard>
          <IcyCardBody className="p-8">
            {errors.form && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {errors.form}
              </div>
            )}

            <Form method="post" className="space-y-5">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-slate-800">Company Details</h2>
                <p className="text-xs text-slate-400">This creates your dedicated HRMS workspace</p>
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

              <div className="border-t border-sky-100 pt-5 space-y-1">
                <h2 className="text-lg font-semibold text-slate-800">Your Account</h2>
                <p className="text-xs text-slate-400">You will be the owner</p>
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

            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link to="/login" className="text-sky-600 font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </IcyCardBody>
        </IcyCard>

        <p className="mt-6 text-center text-xs text-slate-400">
          By signing up you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

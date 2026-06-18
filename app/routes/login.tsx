import { data, redirect, Form, useActionData, useNavigation, Link, useSearchParams } from "react-router";
import type { Route } from "./+types/login";
import { createSupabaseServerClient, appendCookieHeaders } from "~/lib/supabase.server";
import { resolveRedirectAfterLogin, getLoginRedirect } from "~/lib/auth.server";
import { GlaciaLogo } from "~/components/GlaciaLogo";
import { FormField } from "~/components/FormField";
import { Button } from "~/components/Button";
import { IcyCard, IcyCardBody } from "~/components/IcyCard";

export function meta() {
  return [{ title: "Sign In — Glacia HRMS" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const result = await resolveRedirectAfterLogin(request, context.cloudflare.env);
  if (result.redirectTo) return redirect(result.redirectTo);
  return null;
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");

  if (!email || !password) {
    return data({ error: "Email and password are required" }, { status: 400 });
  }

  const { supabase, cookies } = createSupabaseServerClient(request, env);

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return data({ error: "Invalid email or password" }, { status: 401 });
  }

  // Resolve which tenant dashboard to go to
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return data({ error: "Login failed" }, { status: 500 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("must_change_password, tenant:tenants(slug)")
    .eq("id", user.id)
    .single();

  const tenant = (profile as unknown as { tenant: { slug: string } | null })?.tenant;
  const redirectTo = getLoginRedirect({
    must_change_password: profile?.must_change_password,
    tenant,
  });
  const headers = appendCookieHeaders(new Headers(), cookies);

  if (redirectTo) {
    headers.set("Location", redirectTo);
    return new Response(null, { status: 302, headers });
  }

  headers.set("Location", "/login?error=no_tenant");
  return new Response(null, { status: 302, headers });
}

export default function LoginPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const isSubmitting = navigation.state === "submitting";
  const isWelcome = searchParams.get("welcome") === "1";
  const welcomeSlug = searchParams.get("slug");

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        <div className="mb-8">
          <Link to="/" className="inline-block">
            <GlaciaLogo size="lg" />
          </Link>
          <p className="eyebrow mt-4">SIGN IN TO YOUR WORKSPACE</p>
        </div>

        {isWelcome && (
          <div className="bevel mb-5 p-4 text-sm" style={{ borderColor: "var(--ok)" }}>
            <p className="eyebrow mb-1" style={{ color: "var(--ok)" }}>COMPANY CREATED</p>
            Sign in to access your dashboard
            {welcomeSlug && <span className="font-mono ml-1">[{welcomeSlug}]</span>}.
          </div>
        )}

        <IcyCard className="hard-shadow">
          <IcyCardBody className="p-8">
            {actionData?.error && (
              <div className="bevel-sunken mb-5 p-4 text-sm font-mono text-err">
                {actionData.error}
              </div>
            )}
            {searchParams.get("error") === "no_tenant" && (
              <div className="bevel-sunken mb-5 p-4 text-sm font-mono" style={{ color: "var(--warn)" }}>
                Your account is not linked to a company. Contact your HR admin.
              </div>
            )}

            <Form method="post" className="space-y-5">
              <FormField
                label="Work Email"
                name="email"
                type="email"
                placeholder="you@company.com"
                required
                autoComplete="email"
              />

              <FormField
                label="Password"
                name="password"
                type="password"
                placeholder="Your password"
                required
                autoComplete="current-password"
              />

              <Button type="submit" fullWidth loading={isSubmitting} size="lg">
                Sign In
              </Button>
            </Form>

            <p className="mt-4 text-center">
              <Link to="/forgot-password" className="font-mono font-bold text-accent-dark hover:underline uppercase text-xs tracking-wide">
                Forgot password?
              </Link>
            </p>

            <p className="mt-6 text-sm text-ink-2">
              New to Glacia?{" "}
              <Link to="/signup" className="font-mono font-bold text-accent-dark hover:underline uppercase text-xs tracking-wide">
                Create company →
              </Link>
            </p>
          </IcyCardBody>
        </IcyCard>
      </div>
    </div>
  );
}

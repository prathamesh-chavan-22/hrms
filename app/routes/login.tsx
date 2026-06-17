import { data, redirect, Form, useActionData, useNavigation, Link, useSearchParams } from "react-router";
import type { Route } from "./+types/login";
import { createSupabaseServerClient, appendCookieHeaders } from "~/lib/supabase.server";
import { resolveRedirectAfterLogin } from "~/lib/auth.server";
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
    .select("tenant_id, tenant:tenants(slug)")
    .eq("id", user.id)
    .single();

  const slug = (profile as unknown as { tenant: { slug: string } } | null)?.tenant?.slug;
  const headers = appendCookieHeaders(new Headers(), cookies);

  if (slug) {
    headers.set("Location", `/${slug}/dashboard`);
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
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-cyan-200/30 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <GlaciaLogo size="lg" />
          </Link>
          <p className="mt-3 text-slate-500 text-sm">Sign in to your workspace</p>
        </div>

        {isWelcome && (
          <div className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
            🎉 Company created! Sign in to access your dashboard
            {welcomeSlug && <span className="font-mono ml-1">({welcomeSlug})</span>}.
          </div>
        )}

        <IcyCard>
          <IcyCardBody className="p-8">
            {actionData?.error && (
              <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {actionData.error}
              </div>
            )}
            {searchParams.get("error") === "no_tenant" && (
              <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm">
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

            <p className="mt-6 text-center text-sm text-slate-500">
              New to Glacia?{" "}
              <Link to="/signup" className="text-sky-600 font-medium hover:underline">
                Create company account
              </Link>
            </p>
          </IcyCardBody>
        </IcyCard>
      </div>
    </div>
  );
}

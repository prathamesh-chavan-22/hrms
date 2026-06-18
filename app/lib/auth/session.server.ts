import { redirect } from "react-router";
import { createSupabaseServerClient } from "../supabase.server";
import type { Profile, Tenant } from "~/types/app";
import type { ProfileWithTenant } from "~/types/domain";
import { getSuperAdminRedirect, getLoginRedirect } from "./helpers";

export async function getSession(request: Request, env: Env) {
  const { supabase, cookies } = createSupabaseServerClient(request, env);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, cookies, user };
}

export async function requireUser(request: Request, env: Env) {
  const { supabase, cookies, user } = await getSession(request, env);
  if (!user) throw redirect("/login");
  return { supabase, cookies, user };
}

export async function requireProfile(request: Request, env: Env): Promise<{
  profile: Profile;
  tenant: Tenant;
  cookies: { name: string; value: string }[];
}> {
  const { supabase, cookies, user } = await requireUser(request, env);

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, tenant:tenants(*)")
    .eq("id", user.id)
    .single();

  if (!profile) throw redirect("/login");

  const row = profile as ProfileWithTenant;

  return {
    profile: row as Profile,
    tenant: row.tenant,
    cookies,
  };
}

export async function resolveRedirectAfterLogin(request: Request, env: Env) {
  const { supabase, cookies, user } = await getSession(request, env);
  if (!user) return { user: null, cookies, redirectTo: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("must_change_password, tenant:tenants(slug)")
    .eq("id", user.id)
    .single();

  if (!profile) {
    const superAdminRedirect = getSuperAdminRedirect(user.email, env);
    if (superAdminRedirect) return { user, cookies, redirectTo: superAdminRedirect };
    return { user, cookies, redirectTo: null };
  }

  const superAdminRedirect = getSuperAdminRedirect(user.email, env);
  if (superAdminRedirect) return { user, cookies, redirectTo: superAdminRedirect };

  const tenant = (profile as unknown as { tenant: { slug: string } | null }).tenant;
  const redirectTo = getLoginRedirect(
    {
      must_change_password: profile.must_change_password,
      tenant,
    },
    env,
    user.email
  );
  return { user, cookies, redirectTo };
}

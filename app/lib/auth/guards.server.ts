import { redirect } from "react-router";
import { createSupabaseServerClient } from "../supabase.server";
import type { Profile, Tenant } from "~/types/app";
import { isHR } from "~/lib/roles";
import { isSuperAdminEmail } from "./helpers";
import { requireUser, requireProfile } from "./session.server";

export async function requireSuperAdmin(request: Request, env: Env) {
  const { user, cookies } = await requireUser(request, env);
  if (!isSuperAdminEmail(user.email, env)) {
    throw redirect("/login");
  }
  return { user, cookies };
}

export async function requireTenantAccess(
  request: Request,
  env: Env,
  slug: string
): Promise<{ profile: Profile; tenant: Tenant; cookies: { name: string; value: string }[] }> {
  const { profile, tenant, cookies } = await requireProfile(request, env);

  if (tenant.slug !== slug) {
    throw redirect(`/${tenant.slug}/dashboard`);
  }

  return { profile, tenant, cookies };
}

export async function requireHR(request: Request, env: Env, slug: string) {
  const result = await requireTenantAccess(request, env, slug);
  if (!isHR(result.profile.role)) {
    throw redirect(`/${slug}/dashboard`);
  }
  return result;
}

/**
 * Lightweight auth for child route loaders. Validates the session and fetches
 * only the fields needed to scope DB queries (tenant_id, user id, role). The
 * full profile and tenant objects are provided by the layout loader via outlet
 * context, so child loaders should not re-fetch them.
 */
export async function requireChildLoaderAuth(request: Request, env: Env) {
  const { supabase, cookies } = createSupabaseServerClient(request, env);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw redirect("/login");

  const { data: row } = await supabase
    .from("profiles")
    .select("id, role, tenant_id")
    .eq("id", user.id)
    .single();

  if (!row) throw redirect("/login");

  return {
    userId: user.id as string,
    tenantId: row.tenant_id as string,
    role: row.role as string,
    supabase,
    cookies,
  };
}

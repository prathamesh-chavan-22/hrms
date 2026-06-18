import type { EmployeeStatus } from "~/types/app";

export function isActiveProfile(status: EmployeeStatus | string | undefined): boolean {
  return status === "active";
}

export function isSuperAdminEmail(email: string | undefined, env: Env): boolean {
  if (!email || !env.SUPER_ADMIN_EMAIL) return false;
  return email.toLowerCase() === env.SUPER_ADMIN_EMAIL.toLowerCase();
}

export function getSuperAdminRedirect(email: string | undefined, env: Env): string | null {
  return isSuperAdminEmail(email, env) ? "/admin/company-requests" : null;
}

export function generateTempPassword(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
}

export function getLoginRedirect(
  profile: {
    must_change_password?: boolean;
    tenant?: { slug: string } | null;
  } | null,
  env?: Env,
  email?: string
): string | null {
  if (env && email) {
    const superAdminRedirect = getSuperAdminRedirect(email, env);
    if (superAdminRedirect) return superAdminRedirect;
  }
  if (!profile) return null;
  if (profile.must_change_password) return "/change-password";
  const slug = profile.tenant?.slug;
  return slug ? `/${slug}/dashboard` : null;
}

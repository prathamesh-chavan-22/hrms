import { Outlet, useLoaderData, data } from "react-router";
import type { Route } from "./+types/$slug";
import { requireTenantAccess } from "~/lib/auth.server";
import { appendCookieHeaders } from "~/lib/supabase.server";
import { TenantSidebar } from "~/components/TenantSidebar";
import type { Profile, Tenant } from "~/types/app";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const slug = params.slug!;
  const { profile, tenant, cookies } = await requireTenantAccess(
    request,
    context.cloudflare.env,
    slug
  );

  const headers = appendCookieHeaders(new Headers(), cookies);
  return data({ profile, tenant, slug }, { headers });
}

export default function TenantLayout() {
  const { profile, tenant, slug } = useLoaderData<typeof loader>();

  const accentColor = tenant.theme?.accent ?? "#38bdf8";
  const accentDark = tenant.theme?.accentDark ?? "#0ea5e9";

  return (
    <div
      className="flex min-h-screen bg-gradient-to-br from-sky-50 via-white to-cyan-50"
      style={{
        ["--tenant-accent" as string]: accentColor,
        ["--tenant-accent-dark" as string]: accentDark,
      }}
    >
      <TenantSidebar tenant={tenant} profile={profile} slug={slug} />
      <main className="flex-1 overflow-auto">
        <Outlet context={{ profile, tenant, slug }} />
      </main>
    </div>
  );
}

import type { SupabaseClient } from "@supabase/supabase-js";

export async function updateTenantBranding(
  supabase: SupabaseClient,
  params: {
    tenantId: string;
    name: string;
    accentColor: string;
    accentDark: string;
  }
) {
  return supabase
    .from("tenants")
    .update({
      name: params.name,
      theme: { accent: params.accentColor, accentDark: params.accentDark },
    })
    .eq("id", params.tenantId);
}

export async function updateTenantLogo(
  supabase: SupabaseClient,
  params: { tenantId: string; logoUrl: string | null }
) {
  return supabase
    .from("tenants")
    .update({ logo_url: params.logoUrl })
    .eq("id", params.tenantId);
}

export async function updateTenantGpsRequired(
  supabase: SupabaseClient,
  params: { tenantId: string; gpsRequired: boolean }
) {
  return supabase
    .from("tenants")
    .update({ gps_required: params.gpsRequired })
    .eq("id", params.tenantId);
}

export async function uploadTenantLogo(
  supabase: SupabaseClient,
  params: { path: string; data: ArrayBuffer; contentType: string }
) {
  return supabase.storage
    .from("tenant-logos")
    .upload(params.path, params.data, { contentType: params.contentType, upsert: true });
}

export function getTenantLogoPublicUrl(supabase: SupabaseClient, path: string) {
  return supabase.storage.from("tenant-logos").getPublicUrl(path);
}

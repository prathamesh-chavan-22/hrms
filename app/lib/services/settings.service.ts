import type { SupabaseClient } from "@supabase/supabase-js";
import {
  updateTenantBranding,
  updateTenantLogo,
  updateTenantGpsRequired,
  uploadTenantLogo,
  getTenantLogoPublicUrl,
} from "~/lib/repositories/tenants.repository";

import {
  detectRasterImageType,
  extensionForImageType,
} from "~/lib/validation/image-bytes";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export async function updateCompanySettings(
  supabase: SupabaseClient,
  params: {
    tenantId: string;
    name: string;
    accentColor: string;
    accentDark: string;
  }
) {
  if (!params.name.trim()) return { error: "Company name is required" };

  const { error } = await updateTenantBranding(supabase, {
    tenantId: params.tenantId,
    name: params.name.trim(),
    accentColor: params.accentColor,
    accentDark: params.accentDark,
  });

  if (error) return { error: error.message };
  return { success: true as const };
}

export async function uploadCompanyLogo(
  supabase: SupabaseClient,
  params: { tenantId: string; file: File }
) {
  const { file, tenantId } = params;
  if (!file || file.size === 0) return { error: "Please select a logo file" };
  if (file.size > MAX_LOGO_BYTES) return { error: "Logo must be under 2 MB" };

  const arrayBuffer = await file.arrayBuffer();
  const detectedType = detectRasterImageType(arrayBuffer);
  if (!detectedType) {
    return { error: "Only PNG, JPEG, or WebP images are allowed" };
  }

  const ext = extensionForImageType(detectedType);
  const path = `${tenantId}/logo.${ext}`;

  const { error: uploadError } = await uploadTenantLogo(supabase, {
    path,
    data: arrayBuffer,
    contentType: detectedType,
  });

  if (uploadError) return { error: uploadError.message };

  const { data: urlData } = getTenantLogoPublicUrl(supabase, path);
  const logoUrl = urlData.publicUrl + `?t=${Date.now()}`;

  const { error } = await updateTenantLogo(supabase, { tenantId, logoUrl });
  if (error) return { error: error.message };

  return { success: true as const, logoUrl };
}

export async function removeCompanyLogo(supabase: SupabaseClient, tenantId: string) {
  const { error } = await updateTenantLogo(supabase, { tenantId, logoUrl: null });
  if (error) return { error: error.message };
  return { success: true as const };
}

export async function toggleGpsAttendance(
  supabase: SupabaseClient,
  params: { tenantId: string; gpsRequired: boolean }
) {
  const { error } = await updateTenantGpsRequired(supabase, params);
  if (error) return { error: error.message };
  return {
    success: true as const,
    message: `GPS attendance ${params.gpsRequired ? "enabled" : "disabled"}`,
  };
}

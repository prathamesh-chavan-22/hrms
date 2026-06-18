import type { IntentHandler } from "../intent-handler.server";
import { actionSuccess, actionError } from "../action-result";
import { requireHR } from "~/lib/auth/guards.server";
import {
  updateCompanySettings,
  uploadCompanyLogo,
  removeCompanyLogo,
  toggleGpsAttendance,
} from "~/lib/services/settings.service";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { getString, getBooleanFlag } from "~/lib/validation/form-data";

async function getSettingsContext(ctx: Parameters<IntentHandler>[0]) {
  const slug = ctx.params.slug!;
  const { tenant } = await requireHR(ctx.request, ctx.env, slug);
  const { supabase } = createSupabaseServerClient(ctx.request, ctx.env);
  return { tenant, supabase };
}

export const updateCompanyHandler: IntentHandler = async (ctx) => {
  const intent = "update_company";
  const { tenant, supabase } = await getSettingsContext(ctx);

  const result = await updateCompanySettings(supabase, {
    tenantId: tenant.id,
    name: getString(ctx.form, "name"),
    accentColor: getString(ctx.form, "accentColor", "#38bdf8"),
    accentDark: getString(ctx.form, "accentDark", "#0ea5e9"),
  });

  if (result.error) return actionError(result.error, intent, result.error.includes("required") ? 400 : 500);
  return actionSuccess("Company settings updated", intent);
};

export const uploadLogoHandler: IntentHandler = async (ctx) => {
  const intent = "upload_logo";
  const { tenant, supabase } = await getSettingsContext(ctx);
  const file = ctx.form.get("logo") as File | null;

  const result = await uploadCompanyLogo(supabase, { tenantId: tenant.id, file: file! });
  if (result.error) return actionError(result.error, intent, 400);
  return actionSuccess("Logo updated", intent, { logoUrl: result.logoUrl });
};

export const removeLogoHandler: IntentHandler = async (ctx) => {
  const intent = "remove_logo";
  const { tenant, supabase } = await getSettingsContext(ctx);

  const result = await removeCompanyLogo(supabase, tenant.id);
  if (result.error) return actionError(result.error, intent, 500);
  return actionSuccess("Logo removed", intent);
};

export const toggleGpsHandler: IntentHandler = async (ctx) => {
  const intent = "toggle_gps";
  const { tenant, supabase } = await getSettingsContext(ctx);
  const gpsRequired = getBooleanFlag(ctx.form, "gps_required");

  const result = await toggleGpsAttendance(supabase, {
    tenantId: tenant.id,
    gpsRequired,
  });

  if (result.error) return actionError(result.error, intent, 500);
  return actionSuccess(result.message!, intent);
};

export const settingsIntentHandlers: Record<string, IntentHandler> = {
  update_company: updateCompanyHandler,
  upload_logo: uploadLogoHandler,
  remove_logo: removeLogoHandler,
  toggle_gps: toggleGpsHandler,
};

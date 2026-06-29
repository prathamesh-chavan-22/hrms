import type { IntentHandler } from "../intent-handler.server";
import { actionSuccess, actionError } from "../action-result";
import { requireTenantAccess } from "~/lib/auth/guards.server";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import {
  punchIn,
  punchOut,
  normalizeGpsSubmission,
  setAttendanceStatus,
} from "~/lib/attendance.server";
import { profileExistsInTenant } from "~/lib/repositories/profiles.repository";
import { getOptionalFloat, getString } from "~/lib/validation/form-data";
import { isValidIsoDate } from "~/lib/validation/date";
import { isAttendanceStatus } from "~/lib/attendance-status";
import { isHR } from "~/lib/roles";

async function getAttendanceContext(ctx: Parameters<IntentHandler>[0]) {
  const slug = ctx.params.slug!;
  const { profile, tenant } = await requireTenantAccess(ctx.request, ctx.env, slug);
  const { supabase } = createSupabaseServerClient(ctx.request, ctx.env);
  return { profile, tenant, supabase };
}

export const punchInHandler: IntentHandler = async (ctx) => {
  const intent = "punch_in";
  const { profile, tenant, supabase } = await getAttendanceContext(ctx);
  // Coords are client-reported; normalizeGpsSubmission enforces presence/freshness only.
  const { coords, error: coordError } = normalizeGpsSubmission(tenant.gps_required, {
    lat: getOptionalFloat(ctx.form, "lat"),
    lng: getOptionalFloat(ctx.form, "lng"),
    addr: getString(ctx.form, "addr") || null,
    capturedAt: getOptionalFloat(ctx.form, "gps_captured_at"),
    accuracyM: getOptionalFloat(ctx.form, "gps_accuracy_m"),
  });
  if (coordError) return actionError(coordError, intent);

  const { error } = await punchIn(supabase, {
    tenantId: tenant.id,
    userId: profile.id,
    gpsRequired: tenant.gps_required,
    lat: coords.lat,
    lng: coords.lng,
    addr: coords.addr,
  });

  if (error) return actionError(error, intent);
  return actionSuccess("Punched in successfully", intent);
};

export const punchOutHandler: IntentHandler = async (ctx) => {
  const intent = "punch_out";
  const { profile, tenant, supabase } = await getAttendanceContext(ctx);
  const { coords, error: coordError } = normalizeGpsSubmission(tenant.gps_required, {
    lat: getOptionalFloat(ctx.form, "lat"),
    lng: getOptionalFloat(ctx.form, "lng"),
    addr: getString(ctx.form, "addr") || null,
    capturedAt: getOptionalFloat(ctx.form, "gps_captured_at"),
    accuracyM: getOptionalFloat(ctx.form, "gps_accuracy_m"),
  });
  if (coordError) return actionError(coordError, intent);

  const { error } = await punchOut(supabase, {
    tenantId: tenant.id,
    userId: profile.id,
    gpsRequired: tenant.gps_required,
    lat: coords.lat,
    lng: coords.lng,
    addr: coords.addr,
  });

  if (error) return actionError(error, intent);
  return actionSuccess("Punched out successfully", intent);
};

export const setStatusHandler: IntentHandler = async (ctx) => {
  const intent = "set_status";
  const { profile, tenant, supabase } = await getAttendanceContext(ctx);

  if (!isHR(profile.role)) return actionError("Unauthorized", intent, 403);

  const userId = getString(ctx.form, "user_id");
  const date = getString(ctx.form, "date");
  const status = getString(ctx.form, "status");
  const note = getString(ctx.form, "note");

  if (!isValidIsoDate(date)) {
    return actionError("Invalid date", intent, 400);
  }
  if (!isAttendanceStatus(status)) {
    return actionError("Invalid attendance status", intent, 400);
  }

  const { data: target } = await profileExistsInTenant(supabase, {
    userId,
    tenantId: tenant.id,
  });
  if (!target) return actionError("Invalid user", intent);

  const { error } = await setAttendanceStatus(supabase, {
    tenantId: tenant.id,
    userId,
    date,
    status,
    note,
  });

  if (error) return actionError(error, intent);
  return actionSuccess("Status updated", intent);
};

export const attendanceIntentHandlers: Record<string, IntentHandler> = {
  punch_in: punchInHandler,
  punch_out: punchOutHandler,
  set_status: setStatusHandler,
};

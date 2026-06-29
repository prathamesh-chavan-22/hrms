import type { IntentHandler } from "../intent-handler.server";
import { actionSuccess, actionError } from "../action-result";
import { requireTenantAccess, requireHR } from "~/lib/auth/guards.server";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { getTrimmedString } from "~/lib/validation/form-data";
import { isValidIsoDate } from "~/lib/validation/date";
import {
  createLeaveRequest,
  cancelLeaveRequest,
  reviewLeaveRequest,
} from "~/lib/repositories/leave.repository";
import { validateNewLeaveRequest } from "~/lib/services/leave.service";

async function getLeaveContext(ctx: Parameters<IntentHandler>[0]) {
  const slug = ctx.params.slug!;
  const { profile, tenant } = await requireTenantAccess(ctx.request, ctx.env, slug);
  const { supabase } = createSupabaseServerClient(ctx.request, ctx.env);
  return { profile, tenant, supabase };
}

export const applyLeaveHandler: IntentHandler = async (ctx) => {
  const intent = "apply_leave";
  const { profile, tenant, supabase } = await getLeaveContext(ctx);

  const leaveTypeId = getTrimmedString(ctx.form, "leave_type_id");
  const startDate = getTrimmedString(ctx.form, "start_date");
  const endDate = getTrimmedString(ctx.form, "end_date");
  const reason = getTrimmedString(ctx.form, "reason");

  if (!leaveTypeId) return actionError("Leave type is required.", intent);
  if (!startDate || !endDate) return actionError("Start and end dates are required.", intent);
  if (!isValidIsoDate(startDate) || !isValidIsoDate(endDate)) {
    return actionError("Invalid date.", intent);
  }

  const year = new Date(startDate + "T00:00:00").getFullYear();
  const validation = await validateNewLeaveRequest(supabase, {
    tenantId: tenant.id,
    userId: profile.id,
    leaveTypeId,
    startDate,
    endDate,
    year,
  });
  if ("error" in validation) return actionError(validation.error, intent);

  const { error } = await createLeaveRequest(supabase, {
    tenantId: tenant.id,
    userId: profile.id,
    leaveTypeId,
    startDate,
    endDate,
    totalDays: validation.totalDays,
    reason,
  });
  if (error) return actionError("Failed to submit leave request.", intent, 500);

  return actionSuccess("Leave request submitted.", intent);
};

export const cancelLeaveHandler: IntentHandler = async (ctx) => {
  const intent = "cancel_leave";
  const { profile, tenant, supabase } = await getLeaveContext(ctx);
  const requestId = getTrimmedString(ctx.form, "id");
  if (!requestId) return actionError("Request ID is required.", intent);

  const { error, data } = await cancelLeaveRequest(supabase, {
    tenantId: tenant.id,
    userId: profile.id,
    requestId,
  });
  if (error || !data?.length) return actionError("Could not cancel request.", intent, 400);

  return actionSuccess("Leave request cancelled.", intent);
};

export const approveLeaveHandler: IntentHandler = async (ctx) => {
  const intent = "approve_leave";
  const slug = ctx.params.slug!;
  const { profile, tenant } = await requireHR(ctx.request, ctx.env, slug);
  const { supabase } = createSupabaseServerClient(ctx.request, ctx.env);

  const requestId = getTrimmedString(ctx.form, "id");
  const reviewNote = getTrimmedString(ctx.form, "review_note");
  if (!requestId) return actionError("Request ID is required.", intent);

  const { error } = await reviewLeaveRequest(supabase, {
    tenantId: tenant.id,
    requestId,
    status: "approved",
    reviewedBy: profile.id,
    reviewNote,
  });
  if (error) return actionError("Failed to approve request.", intent, 500);

  return actionSuccess("Leave approved.", intent);
};

export const rejectLeaveHandler: IntentHandler = async (ctx) => {
  const intent = "reject_leave";
  const slug = ctx.params.slug!;
  const { profile, tenant } = await requireHR(ctx.request, ctx.env, slug);
  const { supabase } = createSupabaseServerClient(ctx.request, ctx.env);

  const requestId = getTrimmedString(ctx.form, "id");
  const reviewNote = getTrimmedString(ctx.form, "review_note");
  if (!requestId) return actionError("Request ID is required.", intent);

  const { error } = await reviewLeaveRequest(supabase, {
    tenantId: tenant.id,
    requestId,
    status: "rejected",
    reviewedBy: profile.id,
    reviewNote,
  });
  if (error) return actionError("Failed to reject request.", intent, 500);

  return actionSuccess("Leave rejected.", intent);
};

export const leaveIntentHandlers: Record<string, IntentHandler> = {
  apply_leave: applyLeaveHandler,
  cancel_leave: cancelLeaveHandler,
  approve_leave: approveLeaveHandler,
  reject_leave: rejectLeaveHandler,
};

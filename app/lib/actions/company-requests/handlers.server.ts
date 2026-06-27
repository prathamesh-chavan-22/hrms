import type { IntentHandler } from "../intent-handler.server";
import { actionSuccess, actionError } from "../action-result";
import { requireSuperAdmin } from "~/lib/auth/guards.server";
import { approveCompanyRequest, rejectCompanyRequest } from "~/lib/auth/company-requests.server";
import {
  sendWelcomeEmail,
  sendCompanyApprovedEmail,
  sendCompanyRejectedEmail,
} from "~/lib/email.server";
import { fireAndForgetEmail } from "~/lib/email/send-async.server";
import { getString } from "~/lib/validation/form-data";

export const approveRequestHandler: IntentHandler = async (ctx) => {
  const intent = "approve";
  await requireSuperAdmin(ctx.request, ctx.env);
  const requestId = getString(ctx.form, "requestId");

  if (!requestId) return actionError("Missing request ID", intent);

  const result = await approveCompanyRequest(ctx.env, requestId);
  if (result.error) return actionError(result.error, intent);

  const { request: companyRequest, tenant } = result;
  if (companyRequest && tenant) {
    fireAndForgetEmail(
      sendWelcomeEmail(ctx.env, {
        to: companyRequest.owner_email,
        name: companyRequest.owner_name,
        companyName: companyRequest.company_name,
        slug: companyRequest.slug,
      }),
      "welcome",
      { company: companyRequest.company_name },
      ctx.waitUntil
    );

    fireAndForgetEmail(
      sendCompanyApprovedEmail(ctx.env, {
        to: companyRequest.owner_email,
        ownerName: companyRequest.owner_name,
        companyName: companyRequest.company_name,
        slug: companyRequest.slug,
      }),
      "company_approved",
      { company: companyRequest.company_name },
      ctx.waitUntil
    );
  }

  return actionSuccess(`Approved ${companyRequest?.company_name}`, "approve");
};

export const rejectRequestHandler: IntentHandler = async (ctx) => {
  const intent = "reject";
  await requireSuperAdmin(ctx.request, ctx.env);
  const requestId = getString(ctx.form, "requestId");
  const rejectionNote = getString(ctx.form, "rejectionNote").trim();

  if (!requestId) return actionError("Missing request ID", intent);

  const result = await rejectCompanyRequest(ctx.env, requestId, rejectionNote);
  if (result.error) return actionError(result.error, intent);

  if (result.request) {
    fireAndForgetEmail(
      sendCompanyRejectedEmail(ctx.env, {
        to: result.request.owner_email,
        ownerName: result.request.owner_name,
        companyName: result.request.company_name,
        note: rejectionNote || null,
      }),
      "company_rejected",
      { company: result.request.company_name },
      ctx.waitUntil
    );
  }

  return actionSuccess("Request rejected", "reject");
};

export const companyRequestIntentHandlers: Record<string, IntentHandler> = {
  approve: approveRequestHandler,
  reject: rejectRequestHandler,
};

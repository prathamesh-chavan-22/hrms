import { createSupabaseServiceClient } from "../supabase.server";
import { SLUG_REGEX } from "./constants";
import { generateTempPassword } from "./helpers";
import { createTenantWithOwner } from "./tenant.server";

export async function validateCompanyRequest(
  env: Env,
  params: { companyName: string; slug: string; ownerName: string; ownerEmail: string },
  options?: { excludeRequestId?: string }
): Promise<Record<string, string>> {
  const errors: Record<string, string> = {};
  const service = createSupabaseServiceClient(env);

  if (!params.companyName) errors.companyName = "Company name is required";
  if (!params.slug) errors.slug = "Slug is required";
  else if (!SLUG_REGEX.test(params.slug))
    errors.slug = "Slug must be 3-32 chars, lowercase letters, numbers and hyphens only";
  if (!params.ownerName) errors.ownerName = "Your name is required";
  if (!params.ownerEmail) errors.ownerEmail = "Email is required";

  if (Object.keys(errors).length > 0) return errors;

  let pendingSlugQuery = service
    .from("company_requests")
    .select("id")
    .eq("slug", params.slug)
    .eq("status", "pending");
  let pendingEmailQuery = service
    .from("company_requests")
    .select("id")
    .eq("owner_email", params.ownerEmail)
    .eq("status", "pending");

  if (options?.excludeRequestId) {
    pendingSlugQuery = pendingSlugQuery.neq("id", options.excludeRequestId);
    pendingEmailQuery = pendingEmailQuery.neq("id", options.excludeRequestId);
  }

  const [{ data: existingTenant }, { data: pendingSlug }, { data: pendingEmail }] =
    await Promise.all([
      service.from("tenants").select("id").eq("slug", params.slug).maybeSingle(),
      pendingSlugQuery.maybeSingle(),
      pendingEmailQuery.maybeSingle(),
    ]);

  if (existingTenant) errors.slug = "This company URL is already taken";
  else if (pendingSlug) errors.slug = "A pending request already uses this URL";
  if (pendingEmail) errors.ownerEmail = "A pending request already exists for this email";

  return errors;
}

export async function submitCompanyRequest(
  env: Env,
  params: { companyName: string; slug: string; ownerName: string; ownerEmail: string }
) {
  const errors = await validateCompanyRequest(env, params);
  if (Object.keys(errors).length > 0) return { errors };

  const service = createSupabaseServiceClient(env);
  const { error } = await service.from("company_requests").insert({
    company_name: params.companyName,
    slug: params.slug,
    owner_name: params.ownerName,
    owner_email: params.ownerEmail,
    status: "pending",
  });

  if (error) return { errors: { form: error.message } };
  return { success: true };
}

export async function approveCompanyRequest(env: Env, requestId: string) {
  const service = createSupabaseServiceClient(env);

  const { data: request } = await service
    .from("company_requests")
    .select("*")
    .eq("id", requestId)
    .eq("status", "pending")
    .single();

  if (!request) return { error: "Request not found or already reviewed" };

  const validationErrors = await validateCompanyRequest(
    env,
    {
      companyName: request.company_name,
      slug: request.slug,
      ownerName: request.owner_name,
      ownerEmail: request.owner_email,
    },
    { excludeRequestId: requestId }
  );

  if (validationErrors.slug || validationErrors.ownerEmail) {
    return {
      error: validationErrors.slug ?? validationErrors.ownerEmail ?? "Request is no longer valid",
    };
  }

  const tempPassword = generateTempPassword();
  const result = await createTenantWithOwner(env, {
    companyName: request.company_name,
    slug: request.slug,
    ownerEmail: request.owner_email,
    ownerName: request.owner_name,
    password: tempPassword,
  });

  if (result.error) return { error: result.error };

  await service
    .from("profiles")
    .update({ must_change_password: true })
    .eq("id", result.userId!);

  const { error: updateError } = await service
    .from("company_requests")
    .update({
      status: "approved",
      tenant_id: result.tenant!.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "pending");

  if (updateError) return { error: updateError.message };

  return {
    success: true,
    request,
    tenant: result.tenant,
  };
}

export async function rejectCompanyRequest(
  env: Env,
  requestId: string,
  rejectionNote?: string
) {
  const service = createSupabaseServiceClient(env);

  const { data: request, error } = await service
    .from("company_requests")
    .update({
      status: "rejected",
      rejection_note: rejectionNote?.trim() || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "pending")
    .select()
    .single();

  if (error || !request) return { error: "Request not found or already reviewed" };
  return { success: true, request };
}

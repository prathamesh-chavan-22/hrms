import { data, redirect, Form, useLoaderData, useActionData, useNavigation, Link } from "react-router";
import type { Route } from "./+types/admin.company-requests";
import {
  requireSuperAdmin,
  approveCompanyRequest,
  rejectCompanyRequest,
} from "~/lib/auth.server";
import { createSupabaseServiceClient } from "~/lib/supabase.server";
import {
  sendWelcomeEmail,
  sendCompanyApprovedEmail,
  sendCompanyRejectedEmail,
} from "~/lib/email.server";
import { GlaciaLogo } from "~/components/GlaciaLogo";
import { Button } from "~/components/Button";
import { IcyCard, IcyCardBody, IcyCardHeader } from "~/components/IcyCard";
import { FlashMessage } from "~/components/FlashMessage";
import { Badge, statusBadge } from "~/components/Badge";
import type { CompanyRequest } from "~/types/app";

export function meta() {
  return [{ title: "Company Requests — Glacia Admin" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  await requireSuperAdmin(request, context.cloudflare.env);
  const service = createSupabaseServiceClient(context.cloudflare.env);

  const { data: requests } = await service
    .from("company_requests")
    .select("*")
    .order("created_at", { ascending: false });

  return { requests: (requests ?? []) as CompanyRequest[] };
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  await requireSuperAdmin(request, env);

  const form = await request.formData();
  const intent = String(form.get("intent"));
  const requestId = String(form.get("requestId") ?? "");

  if (!requestId) {
    return data({ error: "Missing request ID", success: null }, { status: 400 });
  }

  if (intent === "approve") {
    const result = await approveCompanyRequest(env, requestId);
    if (result.error) {
      return data({ error: result.error, success: null }, { status: 400 });
    }

    const { request: companyRequest, tenant } = result;
    if (companyRequest && tenant) {
      sendWelcomeEmail(env, {
        to: companyRequest.owner_email,
        name: companyRequest.owner_name,
        companyName: companyRequest.company_name,
        slug: companyRequest.slug,
      }).catch(console.error);

      sendCompanyApprovedEmail(env, {
        to: companyRequest.owner_email,
        ownerName: companyRequest.owner_name,
        companyName: companyRequest.company_name,
        slug: companyRequest.slug,
      }).catch(console.error);
    }

    return data({ success: `Approved ${companyRequest?.company_name}`, error: null });
  }

  if (intent === "reject") {
    const rejectionNote = String(form.get("rejectionNote") ?? "").trim();
    const result = await rejectCompanyRequest(env, requestId, rejectionNote);
    if (result.error) {
      return data({ error: result.error, success: null }, { status: 400 });
    }

    if (result.request) {
      sendCompanyRejectedEmail(env, {
        to: result.request.owner_email,
        ownerName: result.request.owner_name,
        companyName: result.request.company_name,
        note: rejectionNote || null,
      }).catch(console.error);
    }

    return data({ success: "Request rejected", error: null });
  }

  return data({ error: "Unknown action", success: null }, { status: 400 });
}

export default function AdminCompanyRequestsPage() {
  const { requests } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const pending = requests.filter((r) => r.status === "pending");
  const reviewed = requests.filter((r) => r.status !== "pending");

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-surface px-5 py-4 flex items-center justify-between">
        <div>
          <Link to="/" className="inline-block">
            <GlaciaLogo size="md" />
          </Link>
          <p className="eyebrow mt-2">SUPER ADMIN</p>
        </div>
        <Form method="post" action="/logout">
          <Button type="submit" variant="secondary" size="sm">
            Sign Out
          </Button>
        </Form>
      </header>

      <div className="p-5 lg:p-7 max-w-5xl mx-auto space-y-5">
        <div>
          <h1 className="display text-3xl text-ink">Company Requests</h1>
          <p className="eyebrow mt-2">{pending.length} PENDING</p>
        </div>

        <FlashMessage message={actionData?.success} variant="success" />
        <FlashMessage message={actionData?.error} variant="error" />

        <IcyCard>
          <IcyCardHeader>
            <h2 className="eyebrow">PENDING</h2>
          </IcyCardHeader>
          <div className="overflow-x-auto">
            {pending.length === 0 ? (
              <div className="py-12 text-center text-ink-2">No pending requests.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="panel-header">
                    <th className="text-left px-5 py-2.5 eyebrow">Company</th>
                    <th className="text-left px-5 py-2.5 eyebrow">Owner</th>
                    <th className="text-left px-5 py-2.5 eyebrow">Submitted</th>
                    <th className="px-5 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((req) => (
                    <tr key={req.id} className="rule-dashed">
                      <td className="px-5 py-3">
                        <p className="font-bold text-ink">{req.company_name}</p>
                        <p className="eyebrow mt-0.5 normal-case tracking-normal">/{req.slug}</p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-ink">{req.owner_name}</p>
                        <p className="eyebrow mt-0.5 normal-case tracking-normal lowercase">{req.owner_email}</p>
                      </td>
                      <td className="px-5 py-3 text-muted text-xs font-mono">
                        {new Date(req.created_at).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col gap-2 items-end">
                          <Form method="post" className="inline">
                            <input type="hidden" name="intent" value="approve" />
                            <input type="hidden" name="requestId" value={req.id} />
                            <Button type="submit" size="sm" loading={isSubmitting}>
                              Approve
                            </Button>
                          </Form>
                          <Form method="post" className="flex gap-2 items-center">
                            <input type="hidden" name="intent" value="reject" />
                            <input type="hidden" name="requestId" value={req.id} />
                            <input
                              name="rejectionNote"
                              placeholder="Optional note"
                              className="text-xs px-2 py-1 border border-line rounded bg-surface"
                            />
                            <Button type="submit" variant="secondary" size="sm" loading={isSubmitting}>
                              Reject
                            </Button>
                          </Form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </IcyCard>

        {reviewed.length > 0 && (
          <IcyCard>
            <IcyCardHeader>
              <h2 className="eyebrow">HISTORY</h2>
            </IcyCardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="panel-header">
                    <th className="text-left px-5 py-2.5 eyebrow">Company</th>
                    <th className="text-left px-5 py-2.5 eyebrow">Owner</th>
                    <th className="text-left px-5 py-2.5 eyebrow">Status</th>
                    <th className="text-left px-5 py-2.5 eyebrow">Reviewed</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewed.map((req) => (
                    <tr key={req.id} className="rule-dashed">
                      <td className="px-5 py-3">
                        <p className="font-bold text-ink">{req.company_name}</p>
                        <p className="eyebrow mt-0.5 normal-case tracking-normal">/{req.slug}</p>
                      </td>
                      <td className="px-5 py-3 text-ink-2">{req.owner_email}</td>
                      <td className="px-5 py-3">
                        <Badge {...statusBadge(req.status)} size="sm">{req.status}</Badge>
                      </td>
                      <td className="px-5 py-3 text-muted text-xs font-mono">
                        {req.reviewed_at
                          ? new Date(req.reviewed_at).toLocaleDateString("en-IN")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </IcyCard>
        )}
      </div>
    </div>
  );
}

import { data, redirect, Form, useLoaderData, useOutletContext, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/$slug.employees";
import { requireHR, requireChildLoaderAuth } from "~/lib/auth.server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "~/lib/supabase.server";
import type { TenantOutletContext } from "./$slug";
import { sendInviteEmail } from "~/lib/email.server";
import { canAddEmployee, getPlan } from "~/lib/plans";
import { IcyCard, IcyCardBody, IcyCardHeader } from "~/components/IcyCard";
import { Badge, roleBadge, statusBadge } from "~/components/Badge";
import { Button } from "~/components/Button";
import { FormField, SelectField } from "~/components/FormField";
import type { Profile } from "~/types/app";
import { useState } from "react";

export function meta() {
  return [{ title: "Employees — Glacia HRMS" }];
}

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const slug = params.slug!;
  const env = context.cloudflare.env;
  const { tenantId, role, supabase } = await requireChildLoaderAuth(request, env);

  if (!["owner", "hr", "admin"].includes(role)) {
    throw redirect(`/${slug}/dashboard`);
  }

  const [employeesRes, invitesRes, countRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role, status, department, designation, employee_code, date_of_joining, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false }),
    supabase
      .from("invites")
      .select("id, email, role, expires_at, accepted_at, created_at")
      .eq("tenant_id", tenantId)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString()),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
  ]);

  return data({
    employees: employeesRes.data ?? [],
    pendingInvites: invitesRes.data ?? [],
    totalCount: countRes.count ?? 0,
  });
}

export async function action({ params, request, context }: Route.ActionArgs) {
  const slug = params.slug!;
  const env = context.cloudflare.env;
  const { profile, tenant } = await requireHR(request, env, slug);
  const form = await request.formData();
  const intent = String(form.get("intent"));

  if (intent === "invite") {
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const role = String(form.get("role") ?? "employee") as Profile["role"];

    if (!email) return data({ error: "Email is required", intent, success: null }, { status: 400 });

    const service = createSupabaseServiceClient(env);
    const { count } = await service
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id);

    if (!canAddEmployee(tenant.plan, count ?? 0)) {
      const plan = getPlan(tenant.plan);
      return data({
        error: `You have reached your plan limit of ${plan.maxEmployees} employees. Upgrade to add more.`,
        intent,
        success: null,
      }, { status: 400 });
    }

    const { data: existing } = await service
      .from("profiles")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("email", email)
      .single();

    if (existing) return data({ error: "This email is already a team member", intent, success: null }, { status: 400 });

    const { data: invite, error: inviteError } = await service
      .from("invites")
      .insert({ tenant_id: tenant.id, email, role, invited_by: profile.id })
      .select()
      .single();

    if (inviteError || !invite) {
      return data({ error: inviteError?.message ?? "Failed to create invite", intent, success: null }, { status: 500 });
    }

    await sendInviteEmail(env, {
      to: email,
      invitedByName: profile.full_name,
      companyName: tenant.name,
      role,
      inviteToken: invite.token,
    });

    return data({ success: `Invite sent to ${email}`, intent, error: null });
  }

  if (intent === "deactivate") {
    const userId = String(form.get("userId"));
    if (userId === profile.id) return data({ error: "Cannot deactivate yourself", intent, success: null }, { status: 400 });
    const service = createSupabaseServiceClient(env);
    await service.from("profiles").update({ status: "inactive" }).eq("id", userId).eq("tenant_id", tenant.id);
    return data({ success: "Employee deactivated", intent, error: null });
  }

  if (intent === "activate") {
    const userId = String(form.get("userId"));
    const service = createSupabaseServiceClient(env);
    await service.from("profiles").update({ status: "active" }).eq("id", userId).eq("tenant_id", tenant.id);
    return data({ success: "Employee activated", intent, error: null });
  }

  return redirect(`/${slug}/employees`);
}

export default function EmployeesPage() {
  const { profile, tenant } = useOutletContext<TenantOutletContext>();
  const { employees, pendingInvites, totalCount } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [showInviteForm, setShowInviteForm] = useState(false);

  const plan = getPlan(tenant.plan);
  const atCap = totalCount >= plan.maxEmployees;

  return (
    <div className="p-5 lg:p-7 space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="eyebrow mb-2">EMPLOYEES</p>
          <h1 className="display text-3xl text-ink">Team Directory</h1>
          <p className="eyebrow mt-2 tnum">{totalCount} OF {plan.maxEmployees} ON {plan.name.toUpperCase()} PLAN</p>
        </div>
        <Button
          onClick={() => setShowInviteForm((v) => !v)}
          disabled={atCap}
          title={atCap ? `Plan limit reached (${plan.maxEmployees})` : undefined}
        >
          + Invite Employee
        </Button>
      </div>

      {/* Flash messages */}
      {actionData?.success && (
        <div className="bevel-sunken p-4 text-sm font-mono" style={{ color: "var(--ok)" }}>
          {actionData.success}
        </div>
      )}
      {actionData?.error && (
        <div className="bevel-sunken p-4 text-sm font-mono text-err">
          {actionData.error}
        </div>
      )}
      {atCap && (
        <div className="bevel-sunken p-4 text-sm font-mono" style={{ color: "var(--warn)" }}>
          You have reached your {plan.name} plan limit of {plan.maxEmployees} employees. Upgrade coming soon via Razorpay.
        </div>
      )}

      {/* Invite Form */}
      {showInviteForm && (
        <IcyCard>
          <IcyCardHeader>
            <h2 className="eyebrow">SEND INVITE</h2>
          </IcyCardHeader>
          <IcyCardBody>
            <Form method="post" className="flex flex-col sm:flex-row gap-4 items-end">
              <input type="hidden" name="intent" value="invite" />
              <FormField
                label="Email Address"
                name="email"
                type="email"
                placeholder="employee@company.com"
                required
                className="flex-1"
              />
              <SelectField
                label="Role"
                name="role"
                defaultValue="employee"
                options={[
                  { value: "employee", label: "Employee" },
                  { value: "hr", label: "HR" },
                  { value: "admin", label: "Admin" },
                ]}
                className="w-40"
              />
              <Button type="submit" loading={isSubmitting} className="mb-0.5">
                Send Invite
              </Button>
            </Form>
          </IcyCardBody>
        </IcyCard>
      )}

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <IcyCard>
          <IcyCardHeader>
            <h2 className="eyebrow tnum">PENDING INVITES ({pendingInvites.length})</h2>
          </IcyCardHeader>
          <IcyCardBody className="p-0">
            <ul>
              {pendingInvites.map((inv) => (
                <li key={inv.id} className="px-5 py-3 flex items-center justify-between rule-dashed first:border-t-0">
                  <div>
                    <p className="text-sm font-bold text-ink">{inv.email}</p>
                    <p className="eyebrow mt-0.5">
                      EXPIRES {new Date(inv.expires_at).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="yellow" size="sm">{inv.role}</Badge>
                    <Badge variant="slate" size="sm">Pending</Badge>
                  </div>
                </li>
              ))}
            </ul>
          </IcyCardBody>
        </IcyCard>
      )}

      {/* Employee table */}
      <IcyCard>
        <IcyCardHeader>
          <h2 className="eyebrow">ALL EMPLOYEES</h2>
        </IcyCardHeader>
        <div className="overflow-x-auto">
          {employees.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-ink-2">No employees yet. Invite your first team member.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="panel-header">
                  <th className="text-left px-5 py-2.5 eyebrow">Name</th>
                  <th className="text-left px-5 py-2.5 eyebrow">Role</th>
                  <th className="text-left px-5 py-2.5 eyebrow">Department</th>
                  <th className="text-left px-5 py-2.5 eyebrow">Status</th>
                  <th className="text-left px-5 py-2.5 eyebrow">Joined</th>
                  <th className="px-5 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} className="rule-dashed hover:bg-surface-2 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="bevel-accent w-8 h-8 flex items-center justify-center text-xs font-mono font-bold flex-shrink-0 !shadow-none">
                          {emp.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-ink">{emp.full_name}</p>
                          <p className="eyebrow mt-0.5 normal-case tracking-normal lowercase">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge {...roleBadge(emp.role)} size="sm">{emp.role}</Badge>
                    </td>
                    <td className="px-5 py-3 text-ink-2">{emp.department ?? "—"}</td>
                    <td className="px-5 py-3">
                      <Badge {...statusBadge(emp.status)} size="sm">{emp.status}</Badge>
                    </td>
                    <td className="px-5 py-3 text-muted text-xs font-mono tnum">
                      {emp.date_of_joining
                        ? new Date(emp.date_of_joining).toLocaleDateString("en-IN")
                        : new Date(emp.created_at).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-5 py-3">
                      {emp.id !== profile.id && (
                        <Form method="post">
                          <input type="hidden" name="userId" value={emp.id} />
                          <input type="hidden" name="intent" value={emp.status === "active" ? "deactivate" : "activate"} />
                          <button
                            type="submit"
                            className="eyebrow hover:underline"
                            style={{ color: emp.status === "active" ? "var(--err)" : "var(--ok)" }}
                          >
                            {emp.status === "active" ? "DEACTIVATE" : "ACTIVATE"}
                          </button>
                        </Form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </IcyCard>
    </div>
  );
}

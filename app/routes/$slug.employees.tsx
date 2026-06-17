import { data, redirect, Form, useLoaderData, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/$slug.employees";
import { requireHR } from "~/lib/auth.server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "~/lib/supabase.server";
import { sendInviteEmail } from "~/lib/email.server";
import { canAddEmployee, getPlan } from "~/lib/plans";
import { IcyCard, IcyCardBody, IcyCardHeader } from "~/components/IcyCard";
import { Badge, roleBadge, statusBadge } from "~/components/Badge";
import { Button } from "~/components/Button";
import { FormField, SelectField } from "~/components/FormField";
import type { Profile, Tenant } from "~/types/app";
import { useState } from "react";

export function meta() {
  return [{ title: "Employees — Glacia HRMS" }];
}

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const slug = params.slug!;
  const env = context.cloudflare.env;
  const { profile, tenant } = await requireHR(request, env, slug);
  const { supabase } = createSupabaseServerClient(request, env);

  const [employeesRes, invitesRes, countRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role, status, department, designation, employee_code, date_of_joining, created_at")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("invites")
      .select("id, email, role, expires_at, accepted_at, created_at")
      .eq("tenant_id", tenant.id)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString()),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id),
  ]);

  return data({
    profile,
    tenant,
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
  const { profile, tenant, employees, pendingInvites, totalCount } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [showInviteForm, setShowInviteForm] = useState(false);

  const plan = getPlan(tenant.plan);
  const atCap = totalCount >= plan.maxEmployees;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Employees</h1>
          <p className="text-slate-500 mt-1 text-sm">
            {totalCount} of {plan.maxEmployees} on {plan.name} plan
          </p>
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
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          {actionData.success}
        </div>
      )}
      {actionData?.error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {actionData.error}
        </div>
      )}
      {atCap && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm">
          You have reached your {plan.name} plan limit of {plan.maxEmployees} employees.{" "}
          <span className="font-medium">Upgrade coming soon via Razorpay.</span>
        </div>
      )}

      {/* Invite Form */}
      {showInviteForm && (
        <IcyCard>
          <IcyCardHeader>
            <h2 className="text-base font-semibold text-slate-800">Send Invite</h2>
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
            <h2 className="text-base font-semibold text-slate-800">Pending Invites ({pendingInvites.length})</h2>
          </IcyCardHeader>
          <IcyCardBody className="p-0">
            <ul className="divide-y divide-sky-50">
              {pendingInvites.map((inv) => (
                <li key={inv.id} className="px-6 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{inv.email}</p>
                    <p className="text-xs text-slate-400">
                      Expires {new Date(inv.expires_at).toLocaleDateString("en-IN")}
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
          <h2 className="text-base font-semibold text-slate-800">All Employees</h2>
        </IcyCardHeader>
        <div className="overflow-x-auto">
          {employees.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-4xl mb-3">👥</p>
              <p className="text-slate-500">No employees yet. Invite your first team member!</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sky-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Department</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Joined</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-50">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-sky-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 text-xs font-bold flex-shrink-0">
                          {emp.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{emp.full_name}</p>
                          <p className="text-xs text-slate-400">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge {...roleBadge(emp.role)} size="sm">{emp.role}</Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{emp.department ?? "—"}</td>
                    <td className="px-6 py-4">
                      <Badge {...statusBadge(emp.status)} size="sm">{emp.status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {emp.date_of_joining
                        ? new Date(emp.date_of_joining).toLocaleDateString("en-IN")
                        : new Date(emp.created_at).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-6 py-4">
                      {emp.id !== profile.id && (
                        <Form method="post">
                          <input type="hidden" name="userId" value={emp.id} />
                          <input type="hidden" name="intent" value={emp.status === "active" ? "deactivate" : "activate"} />
                          <button
                            type="submit"
                            className={`text-xs font-medium hover:underline ${
                              emp.status === "active" ? "text-red-500" : "text-emerald-600"
                            }`}
                          >
                            {emp.status === "active" ? "Deactivate" : "Activate"}
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

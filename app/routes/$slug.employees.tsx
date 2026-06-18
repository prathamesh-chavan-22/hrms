import { data, redirect, Form, useLoaderData, useOutletContext, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/$slug.employees";
import { requireHR, requireChildLoaderAuth, createEmployeeAccount, resetEmployeePassword } from "~/lib/auth.server";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import type { TenantOutletContext } from "./$slug";
import { sendAccountCreatedEmail } from "~/lib/email.server";
import { canAddEmployee, getPlan } from "~/lib/plans";
import { IcyCard, IcyCardBody, IcyCardHeader } from "~/components/IcyCard";
import { Badge, roleBadge, statusBadge } from "~/components/Badge";
import { Button } from "~/components/Button";
import { FormField, SelectField } from "~/components/FormField";
import { FlashMessage } from "~/components/FlashMessage";
import { isHR, inviteRoleOptions, isInvitableRole, canResetPassword } from "~/lib/roles";
import { useState } from "react";

export function meta() {
  return [{ title: "Employees — Glacia HRMS" }];
}

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const slug = params.slug!;
  const env = context.cloudflare.env;
  const { tenantId, role, supabase } = await requireChildLoaderAuth(request, env);

  if (!isHR(role)) {
    throw redirect(`/${slug}/dashboard`);
  }

  const [employeesRes, countRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role, status, department, designation, employee_code, date_of_joining, created_at, must_change_password")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
  ]);

  return data({
    employees: employeesRes.data ?? [],
    totalCount: countRes.count ?? 0,
  });
}

export async function action({ params, request, context }: Route.ActionArgs) {
  const slug = params.slug!;
  const env = context.cloudflare.env;
  const { profile, tenant } = await requireHR(request, env, slug);
  const { supabase } = createSupabaseServerClient(request, env);
  const form = await request.formData();
  const intent = String(form.get("intent"));

  if (intent === "create") {
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const fullName = String(form.get("fullName") ?? "").trim();
    const rawRole = String(form.get("role") ?? "employee");
    const password = String(form.get("password") ?? "");

    if (!isInvitableRole(rawRole, profile.role)) {
      return data({ error: "Invalid role", intent, success: null }, { status: 403 });
    }

    const role = rawRole;

    if (!email) return data({ error: "Email is required", intent, success: null }, { status: 400 });
    if (!fullName) return data({ error: "Full name is required", intent, success: null }, { status: 400 });
    if (password.length < 8) return data({ error: "Password must be at least 8 characters", intent, success: null }, { status: 400 });

    const { count } = await supabase
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

    const result = await createEmployeeAccount(env, {
      tenantId: tenant.id,
      email,
      fullName,
      role,
      password,
      tenantPlan: tenant.plan,
    });

    if (result.error) {
      return data({ error: result.error, intent, success: null }, { status: 400 });
    }

    await sendAccountCreatedEmail(env, {
      to: email,
      fullName,
      companyName: tenant.name,
      temporaryPassword: password,
    }).catch(console.error);

    return data({ success: `Account created for ${fullName}. They must change their password on first login.`, intent, error: null });
  }

  if (intent === "reset_password") {
    if (!canResetPassword(profile.role)) {
      return data({ error: "Only owner and admin can reset passwords", intent, success: null }, { status: 403 });
    }

    const userId = String(form.get("userId"));
    const newPassword = String(form.get("newPassword") ?? "");

    if (userId === profile.id) {
      return data({ error: "Use account settings to change your own password", intent, success: null }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return data({ error: "Password must be at least 8 characters", intent, success: null }, { status: 400 });
    }

    const result = await resetEmployeePassword(env, {
      userId,
      tenantId: tenant.id,
      newPassword,
    });

    if (result.error) {
      return data({ error: result.error, intent, success: null }, { status: 400 });
    }

    return data({ success: "Password reset. Employee must change it on next login.", intent, error: null });
  }

  if (intent === "deactivate") {
    const userId = String(form.get("userId"));
    if (userId === profile.id) return data({ error: "Cannot deactivate yourself", intent, success: null }, { status: 400 });
    const { error } = await supabase.from("profiles").update({ status: "inactive" }).eq("id", userId).eq("tenant_id", tenant.id);
    if (error) return data({ error: error.message, intent, success: null }, { status: 500 });
    return data({ success: "Employee deactivated", intent, error: null });
  }

  if (intent === "activate") {
    const userId = String(form.get("userId"));
    const { error } = await supabase.from("profiles").update({ status: "active" }).eq("id", userId).eq("tenant_id", tenant.id);
    if (error) return data({ error: error.message, intent, success: null }, { status: 500 });
    return data({ success: "Employee activated", intent, error: null });
  }

  return redirect(`/${slug}/employees`);
}

export default function EmployeesPage() {
  const { profile, tenant } = useOutletContext<TenantOutletContext>();
  const { employees, totalCount } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);

  const plan = getPlan(tenant.plan);
  const atCap = totalCount >= plan.maxEmployees;
  const roleOptions = inviteRoleOptions(profile.role);
  const canChooseRole = roleOptions.length > 1;
  const canReset = canResetPassword(profile.role);

  return (
    <div className="p-5 lg:p-7 space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="eyebrow mb-2">EMPLOYEES</p>
          <h1 className="display text-3xl text-ink">Team Directory</h1>
          <p className="eyebrow mt-2 tnum">{totalCount} OF {plan.maxEmployees} ON {plan.name.toUpperCase()} PLAN</p>
        </div>
        <Button
          onClick={() => setShowCreateForm((v) => !v)}
          disabled={atCap}
          title={atCap ? `Plan limit reached (${plan.maxEmployees})` : undefined}
        >
          + Add Employee
        </Button>
      </div>

      <FlashMessage message={actionData?.success} variant="success" />
      <FlashMessage message={actionData?.error} variant="error" />
      {atCap && (
        <div className="bevel-sunken p-4 text-sm font-mono" style={{ color: "var(--warn)" }}>
          You have reached your {plan.name} plan limit of {plan.maxEmployees} employees. Upgrade coming soon via Razorpay.
        </div>
      )}

      {showCreateForm && (
        <IcyCard>
          <IcyCardHeader>
            <h2 className="eyebrow">CREATE EMPLOYEE ACCOUNT</h2>
          </IcyCardHeader>
          <IcyCardBody>
            <Form method="post" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input type="hidden" name="intent" value="create" />
              <FormField
                label="Full Name"
                name="fullName"
                placeholder="Jane Doe"
                required
              />
              <FormField
                label="Email Address"
                name="email"
                type="email"
                placeholder="employee@company.com"
                required
              />
              <FormField
                label="Temporary Password"
                name="password"
                type="password"
                placeholder="Min. 8 characters"
                required
                autoComplete="new-password"
              />
              {canChooseRole ? (
                <SelectField
                  label="Role"
                  name="role"
                  defaultValue="employee"
                  options={roleOptions}
                />
              ) : (
                <input type="hidden" name="role" value="employee" />
              )}
              <div className="sm:col-span-2 flex gap-3">
                <Button type="submit" loading={isSubmitting}>
                  Create Account
                </Button>
                <p className="text-xs text-ink-2 self-center">
                  Employee will be prompted to change password on first login.
                </p>
              </div>
            </Form>
          </IcyCardBody>
        </IcyCard>
      )}

      {resetUserId && (
        <IcyCard>
          <IcyCardHeader>
            <h2 className="eyebrow">RESET PASSWORD</h2>
          </IcyCardHeader>
          <IcyCardBody>
            <Form method="post" className="flex flex-col sm:flex-row gap-4 items-end">
              <input type="hidden" name="intent" value="reset_password" />
              <input type="hidden" name="userId" value={resetUserId} />
              <FormField
                label="New Temporary Password"
                name="newPassword"
                type="password"
                placeholder="Min. 8 characters"
                required
                autoComplete="new-password"
                className="flex-1"
              />
              <div className="flex gap-2 mb-0.5">
                <Button type="submit" loading={isSubmitting}>
                  Reset Password
                </Button>
                <Button type="button" variant="secondary" onClick={() => setResetUserId(null)}>
                  Cancel
                </Button>
              </div>
            </Form>
          </IcyCardBody>
        </IcyCard>
      )}

      <IcyCard>
        <IcyCardHeader>
          <h2 className="eyebrow">ALL EMPLOYEES</h2>
        </IcyCardHeader>
        <div className="overflow-x-auto">
          {employees.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-ink-2">No employees yet. Add your first team member.</p>
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
                          {emp.must_change_password && (
                            <p className="text-xs font-mono mt-0.5" style={{ color: "var(--warn)" }}>
                              pending first login
                            </p>
                          )}
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
                        <div className="flex flex-col gap-1 items-end">
                          {canReset && emp.role !== "owner" && (
                            <button
                              type="button"
                              onClick={() => setResetUserId(emp.id)}
                              className="eyebrow hover:underline text-accent-dark"
                            >
                              RESET PW
                            </button>
                          )}
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
                        </div>
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

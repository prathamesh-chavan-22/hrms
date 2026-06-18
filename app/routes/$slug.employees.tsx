import { data, redirect, Form, useLoaderData, useOutletContext, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/$slug.employees";
import { requireChildLoaderAuth } from "~/lib/auth.server";
import type { TenantOutletContext } from "./$slug";
import { canAddEmployee, getPlan } from "~/lib/plans";
import { Button } from "~/components/Button";
import { FormField } from "~/components/FormField";
import { FlashMessage } from "~/components/FlashMessage";
import { IcyCard, IcyCardBody, IcyCardHeader } from "~/components/IcyCard";
import { inviteRoleOptions, isHR, canResetPassword } from "~/lib/roles";
import { loadEmployeeDirectory } from "~/lib/services/employees.service";
import { dispatchIntent } from "~/lib/actions/intent-handler.server";
import { employeeIntentHandlers } from "~/lib/actions/employees/handlers.server";
import { getIntent } from "~/lib/validation/form-data";
import { InviteEmployeeForm } from "~/components/employees/InviteEmployeeForm";
import { PendingInvites } from "~/components/employees/PendingInvites";
import { EmployeeTable } from "~/components/employees/EmployeeTable";
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

  const directory = await loadEmployeeDirectory(supabase, tenantId);
  return data(directory);
}

export async function action({ params, request, context }: Route.ActionArgs) {
  const form = await request.formData();
  const intent = getIntent(form);

  if (!employeeIntentHandlers[intent]) {
    return redirect(`/${params.slug!}/employees`);
  }

  return dispatchIntent(intent, employeeIntentHandlers, {
    request,
    form,
    env: context.cloudflare.env,
    params,
  });
}

export default function EmployeesPage() {
  const { profile, tenant } = useOutletContext<TenantOutletContext>();
  const { employees, totalCount, pendingInvites, pendingInviteCount } = useLoaderData<typeof loader>();
  const actionData = useActionData<{
    success?: string | null;
    error?: string | null;
    intent?: string;
  }>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);

  const plan = getPlan(tenant.plan);
  const seatCount = totalCount + pendingInviteCount;
  const atCap = !canAddEmployee(tenant.plan, seatCount);
  const roleOptions = inviteRoleOptions(profile.role);
  const canChooseRole = roleOptions.length > 1;
  const canReset = canResetPassword(profile.role);

  return (
    <div className="p-5 lg:p-7 space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="eyebrow mb-2">EMPLOYEES</p>
          <h1 className="display text-3xl text-ink">Team Directory</h1>
          <p className="eyebrow mt-2 tnum">
            {totalCount} ACTIVE · {pendingInviteCount} PENDING INVITES · {plan.maxEmployees} MAX ON {plan.name.toUpperCase()}
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

      <FlashMessage message={actionData?.success} variant="success" />
      <FlashMessage message={actionData?.error} variant="error" />
      {atCap && (
        <div className="bevel-sunken p-4 text-sm font-mono" style={{ color: "var(--warn)" }}>
          You have reached your {plan.name} plan limit of {plan.maxEmployees} seats (including pending invites). Upgrade coming soon via Razorpay.
        </div>
      )}

      {showInviteForm && (
        <InviteEmployeeForm
          roleOptions={roleOptions}
          canChooseRole={canChooseRole}
          isSubmitting={isSubmitting}
        />
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

      <PendingInvites invites={pendingInvites} />

      <EmployeeTable
        employees={employees}
        currentUserId={profile.id}
        canReset={canReset}
        onResetPassword={setResetUserId}
      />
    </div>
  );
}

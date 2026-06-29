import {
  data,
  Form,
  useLoaderData,
  useActionData,
  useNavigation,
  useSearchParams,
} from "react-router";
import { useState, useEffect } from "react";
import type { Route } from "./+types/$slug.leave";
import { requireChildLoaderAuth } from "~/lib/auth.server";
import { IcyCard, IcyCardBody, IcyCardHeader } from "~/components/IcyCard";
import { Button } from "~/components/Button";
import { FormField, SelectField } from "~/components/FormField";
import { FlashMessage } from "~/components/FlashMessage";
import { Badge, statusBadge } from "~/components/Badge";
import { isHR } from "~/lib/roles";
import { dispatchIntent } from "~/lib/actions/intent-handler.server";
import { leaveIntentHandlers } from "~/lib/actions/leave/handlers.server";
import { getIntent } from "~/lib/validation/form-data";
import { loadLeavePageData } from "~/lib/services/leave.service";
import type { LeaveRequestRow } from "~/lib/repositories/leave.repository";

export function meta() {
  return [{ title: "Leave — Glacia HRMS" }];
}

type BalanceRow = {
  id: string;
  name: string;
  code: string;
  days_per_year: number;
  entitled: number;
  used: number;
  remaining: number;
};

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const { tenantId, userId, supabase, role } = await requireChildLoaderAuth(request, env);

  const url = new URL(request.url);
  const year =
    parseInt(url.searchParams.get("year") ?? "") || new Date().getFullYear();

  const pageData = await loadLeavePageData(supabase, {
    tenantId,
    userId,
    year,
    isHR: isHR(role),
  });

  return data({
    ...pageData,
    year,
    isHR: isHR(role),
  });
}

export async function action({ params, request, context }: Route.ActionArgs) {
  const form = await request.formData();
  const intent = getIntent(form);

  if (!leaveIntentHandlers[intent]) {
    return data({ error: "Unknown intent", success: null, intent });
  }

  return dispatchIntent(intent, leaveIntentHandlers, {
    request,
    form,
    env: context.cloudflare.env,
    params,
    waitUntil: (p) => context.cloudflare.ctx.waitUntil(p),
  });
}

function ApplyLeavePanel({
  balances,
  onClose,
  isSubmitting,
  currentIntent,
  actionData,
}: {
  balances: BalanceRow[];
  onClose: () => void;
  isSubmitting: boolean;
  currentIntent: string | null;
  actionData: { success?: string | null; error?: string | null; intent?: string } | undefined;
}) {
  const intent = "apply_leave";
  const busy = isSubmitting && currentIntent === intent;
  const succeeded =
    !isSubmitting && actionData?.intent === intent && !!actionData.success;

  useEffect(() => {
    if (succeeded) onClose();
  }, [succeeded, onClose]);

  const typeOptions = balances
    .filter((b) => b.days_per_year > 0)
    .map((b) => ({
      value: b.id,
      label: `${b.name} (${b.code}) — ${b.remaining} remaining`,
    }));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-bg opacity-70"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative bevel hard-shadow bg-surface w-full max-w-md space-y-5 p-6 z-10">
        <div className="flex items-center justify-between">
          <h2 className="eyebrow">APPLY LEAVE</h2>
          <button
            type="button"
            onClick={onClose}
            className="eyebrow text-ink-2 hover:text-ink transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {typeOptions.length === 0 ? (
          <p className="text-sm text-ink-2">No leave types with available balance.</p>
        ) : (
          <Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value={intent} />

            <SelectField
              label="Leave Type"
              name="leave_type_id"
              options={typeOptions}
              required
            />

            <FormField label="Start Date" name="start_date" type="date" required />
            <FormField label="End Date" name="end_date" type="date" required />

            <div>
              <label htmlFor="reason" className="eyebrow block mb-1.5">
                Reason (optional)
              </label>
              <textarea
                id="reason"
                name="reason"
                rows={3}
                placeholder="Brief reason for leave"
                className="bevel-sunken w-full px-3 py-2.5 text-sm text-ink placeholder:text-muted bg-surface-2 focus:outline-none focus:border-accent"
              />
            </div>

            {actionData?.error && actionData.intent === intent && (
              <p className="text-xs font-mono text-err">{actionData.error}</p>
            )}

            <div className="flex gap-3 pt-1">
              <Button type="submit" loading={busy} fullWidth>
                Submit Request
              </Button>
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </Form>
        )}
      </div>
    </div>
  );
}

function RequestRow({
  request: req,
  isSubmitting,
  currentIntent,
  formId,
  showEmployee,
  hrActions,
}: {
  request: LeaveRequestRow;
  isSubmitting: boolean;
  currentIntent: string | null;
  formId?: string;
  showEmployee?: boolean;
  hrActions?: boolean;
}) {
  const typeName = req.leave_types?.name ?? "Leave";
  const typeCode = req.leave_types?.code ?? "";
  const { variant } = statusBadge(req.status);
  const cancelling =
    isSubmitting &&
    currentIntent === "cancel_leave" &&
    formId === req.id;

  return (
    <li className="px-5 py-3 flex items-center gap-4 rule-dashed first:border-t-0 flex-wrap">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="text-sm font-bold text-ink">
            {typeName} ({typeCode})
          </span>
          <Badge variant={variant} size="sm">
            {req.status}
          </Badge>
        </div>
        <p className="eyebrow text-ink-2">
          {fmtDate(req.start_date)} → {fmtDate(req.end_date)} · {req.total_days} day
          {req.total_days !== 1 ? "s" : ""}
        </p>
        {showEmployee && req.profiles?.full_name && (
          <p className="eyebrow text-ink-2 mt-0.5">{req.profiles.full_name}</p>
        )}
        {req.reason && (
          <p className="text-xs text-muted mt-1 truncate">{req.reason}</p>
        )}
      </div>

      {req.status === "pending" && !hrActions && (
        <Form method="post">
          <input type="hidden" name="intent" value="cancel_leave" />
          <input type="hidden" name="id" value={req.id} />
          <button
            type="submit"
            disabled={cancelling}
            className="eyebrow hover:underline disabled:opacity-45 transition-colors"
            style={{ color: "var(--err)" }}
          >
            {cancelling ? "…" : "CANCEL"}
          </button>
        </Form>
      )}

      {hrActions && req.status === "pending" && (
        <div className="flex items-center gap-2 shrink-0">
          <Form method="post" className="flex items-center gap-2">
            <input type="hidden" name="intent" value="approve_leave" />
            <input type="hidden" name="id" value={req.id} />
            <Button
              type="submit"
              size="sm"
              loading={isSubmitting && currentIntent === "approve_leave"}
            >
              Approve
            </Button>
          </Form>
          <Form method="post" className="flex items-center gap-2">
            <input type="hidden" name="intent" value="reject_leave" />
            <input type="hidden" name="id" value={req.id} />
            <Button
              type="submit"
              variant="danger"
              size="sm"
              loading={isSubmitting && currentIntent === "reject_leave"}
            >
              Reject
            </Button>
          </Form>
        </div>
      )}
    </li>
  );
}

export default function LeavePage() {
  const { balances, requests, pendingQueue, year, isHR: hrUser } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [, setSearchParams] = useSearchParams();

  const isSubmitting = navigation.state === "submitting";
  const currentIntent = navigation.formData?.get("intent") as string | null;
  const [showForm, setShowForm] = useState(false);

  const typedBalances = balances as BalanceRow[];
  const typedRequests = requests as LeaveRequestRow[];
  const typedPending = pendingQueue as LeaveRequestRow[];

  const applicableTypes = typedBalances.filter((b) => b.days_per_year > 0);

  function changeYear(delta: number) {
    setSearchParams({ year: String(year + delta) });
  }

  return (
    <div className="p-5 lg:p-7 space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="eyebrow mb-2">LEAVE</p>
          <h1 className="display text-3xl text-ink">Apply &amp; track balance</h1>
        </div>
        {applicableTypes.length > 0 && (
          <Button onClick={() => setShowForm(true)}>+ Apply Leave</Button>
        )}
      </div>

      <FlashMessage message={actionData?.success} variant="success" />
      <FlashMessage
        message={
          actionData?.error && actionData.intent !== "apply_leave"
            ? actionData.error
            : null
        }
        variant="error"
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => changeYear(-1)}
          className="bevel bevel-press px-3 py-1.5 font-mono font-bold text-xs text-ink"
          aria-label="Previous year"
        >
          ←
        </button>
        <span className="display text-xl text-ink tnum">{year}</span>
        <button
          type="button"
          onClick={() => changeYear(1)}
          className="bevel bevel-press px-3 py-1.5 font-mono font-bold text-xs text-ink"
          aria-label="Next year"
        >
          →
        </button>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {typedBalances.map((b) => (
          <IcyCard key={b.id} className="hard-shadow">
            <IcyCardBody className="py-4">
              <p className="eyebrow mb-1">{b.code}</p>
              <p className="text-sm font-bold text-ink truncate">{b.name}</p>
              <p
                className="display text-3xl font-bold tnum mt-2"
                style={{ color: "var(--accent)" }}
              >
                {String(b.remaining).padStart(2, "0")}
              </p>
              <p className="eyebrow mt-1 text-ink-2">
                {b.used} used · {b.entitled} entitled
              </p>
            </IcyCardBody>
          </IcyCard>
        ))}
      </div>

      {/* HR pending queue */}
      {hrUser && typedPending.length > 0 && (
        <IcyCard className="hard-shadow">
          <IcyCardHeader>
            <h2 className="eyebrow">PENDING APPROVALS ({typedPending.length})</h2>
          </IcyCardHeader>
          <IcyCardBody className="p-0">
            <ul>
              {typedPending.map((req) => (
                <RequestRow
                  key={req.id}
                  request={req}
                  isSubmitting={isSubmitting}
                  currentIntent={currentIntent}
                  showEmployee
                  hrActions
                />
              ))}
            </ul>
          </IcyCardBody>
        </IcyCard>
      )}

      {/* My requests */}
      <IcyCard className="hard-shadow">
        <IcyCardHeader>
          <h2 className="eyebrow">MY REQUESTS — {year}</h2>
        </IcyCardHeader>
        <IcyCardBody className="p-0">
          {typedRequests.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ink-2">
              No leave requests for {year}.
              {applicableTypes.length > 0 && (
                <>
                  {" "}
                  <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="underline text-accent"
                  >
                    Apply now
                  </button>
                  .
                </>
              )}
            </p>
          ) : (
            <ul>
              {typedRequests.map((req) => (
                <RequestRow
                  key={req.id}
                  request={req}
                  isSubmitting={isSubmitting}
                  currentIntent={currentIntent}
                  formId={req.id}
                />
              ))}
            </ul>
          )}
        </IcyCardBody>
      </IcyCard>

      {showForm && (
        <ApplyLeavePanel
          balances={typedBalances}
          onClose={() => setShowForm(false)}
          isSubmitting={isSubmitting}
          currentIntent={currentIntent}
          actionData={actionData}
        />
      )}
    </div>
  );
}

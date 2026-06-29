import {
  data,
  Form,
  useLoaderData,
  useActionData,
  useNavigation,
  useSearchParams,
} from "react-router";
import { useState, useEffect } from "react";
import type { Route } from "./+types/$slug.holidays";
import { requireChildLoaderAuth } from "~/lib/auth.server";
import { IcyCard, IcyCardBody, IcyCardHeader } from "~/components/IcyCard";
import { Button } from "~/components/Button";
import { FormField, SelectField } from "~/components/FormField";
import { FlashMessage } from "~/components/FlashMessage";
import { Badge } from "~/components/Badge";
import { isHR } from "~/lib/roles";
import { dispatchIntent } from "~/lib/actions/intent-handler.server";
import { holidaysIntentHandlers } from "~/lib/actions/holidays/handlers.server";
import { getIntent } from "~/lib/validation/form-data";
import { listHolidaysForYear } from "~/lib/repositories/holidays.repository";

export function meta() {
  return [{ title: "Holidays — Glacia HRMS" }];
}

type HolidayRow = {
  id: string;
  name: string;
  date: string;
  type: string;
  description: string | null;
};

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const { tenantId, supabase, role } = await requireChildLoaderAuth(request, env);

  const url = new URL(request.url);
  const year =
    parseInt(url.searchParams.get("year") ?? "") || new Date().getFullYear();

  const { data: holidays } = await listHolidaysForYear(supabase, tenantId, year);

  return data({
    holidays: (holidays ?? []) as HolidayRow[],
    year,
    isHR: isHR(role),
  });
}

export async function action({ params, request, context }: Route.ActionArgs) {
  const form = await request.formData();
  const intent = getIntent(form);

  if (!holidaysIntentHandlers[intent]) {
    return data({ error: "Unknown intent", success: null, intent });
  }

  return dispatchIntent(intent, holidaysIntentHandlers, {
    request,
    form,
    env: context.cloudflare.env,
    params,
    waitUntil: (p) => context.cloudflare.ctx.waitUntil(p),
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const TYPE_OPTIONS = [
  { value: "national", label: "National" },
  { value: "optional", label: "Optional" },
  { value: "company",  label: "Company"  },
];

function typeBadgeVariant(type: string): "green" | "yellow" | "sky" {
  if (type === "national") return "green";
  if (type === "optional") return "yellow";
  return "sky";
}

function groupByMonth(holidays: HolidayRow[]) {
  const map = new Map<number, HolidayRow[]>();
  for (const h of holidays) {
    const m = new Date(h.date + "T00:00:00").getMonth(); // 0-based
    if (!map.has(m)) map.set(m, []);
    map.get(m)!.push(h);
  }
  return map;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HolidayFormPanel({
  editing,
  onClose,
  isSubmitting,
  currentIntent,
  actionData,
}: {
  editing: HolidayRow | null;
  onClose: () => void;
  isSubmitting: boolean;
  currentIntent: string | null;
  actionData: { success?: string | null; error?: string | null; intent?: string } | undefined;
}) {
  const intent = editing ? "update_holiday" : "create_holiday";
  const busy = isSubmitting && currentIntent === intent;
  const succeeded =
    !isSubmitting &&
    actionData?.intent === intent &&
    !!actionData.success;

  useEffect(() => {
    if (succeeded) onClose();
  }, [succeeded, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-bg opacity-70"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative bevel hard-shadow bg-surface w-full max-w-md space-y-5 p-6 z-10">
        <div className="flex items-center justify-between">
          <h2 className="eyebrow">
            {editing ? "EDIT HOLIDAY" : "ADD HOLIDAY"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="eyebrow text-ink-2 hover:text-ink transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <Form method="post" className="space-y-4">
          <input type="hidden" name="intent" value={intent} />
          {editing && <input type="hidden" name="id" value={editing.id} />}

          <FormField
            label="Holiday Name"
            name="name"
            required
            placeholder="Republic Day"
            defaultValue={editing?.name ?? ""}
          />

          <FormField
            label="Date"
            name="date"
            type="date"
            required
            defaultValue={editing?.date ?? ""}
          />

          <SelectField
            label="Type"
            name="type"
            options={TYPE_OPTIONS}
            defaultValue={editing?.type ?? "national"}
            required
          />

          <FormField
            label="Description (optional)"
            name="description"
            placeholder="e.g. National holiday"
            defaultValue={editing?.description ?? ""}
          />

          {actionData?.error && actionData.intent === intent && (
            <p className="text-xs font-mono text-err">{actionData.error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="submit" loading={busy} fullWidth>
              {editing ? "Save Changes" : "Add Holiday"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              Cancel
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HolidaysPage() {
  const { holidays, year, isHR: hrUser } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [, setSearchParams] = useSearchParams();

  const isSubmitting = navigation.state === "submitting";
  const currentIntent = navigation.formData?.get("intent") as string | null;

  const [showForm, setShowForm] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<HolidayRow | null>(null);

  const grouped = groupByMonth(holidays);

  const nationalCount = holidays.filter((h) => h.type === "national").length;
  const optionalCount = holidays.filter((h) => h.type === "optional").length;
  const companyCount  = holidays.filter((h) => h.type === "company").length;

  function openAdd() {
    setEditingHoliday(null);
    setShowForm(true);
  }
  function openEdit(h: HolidayRow) {
    setEditingHoliday(h);
    setShowForm(true);
  }
  function closeForm() {
    setShowForm(false);
    setEditingHoliday(null);
  }

  function changeYear(delta: number) {
    setSearchParams({ year: String(year + delta) });
  }

  return (
    <div className="p-5 lg:p-7 space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="eyebrow mb-2">HOLIDAYS</p>
          <h1 className="display text-3xl text-ink">Company &amp; National Calendar</h1>
        </div>
        {hrUser && (
          <Button id="add-holiday-btn" onClick={openAdd}>
            + Add Holiday
          </Button>
        )}
      </div>

      {/* Flash */}
      <FlashMessage message={actionData?.success} variant="success" />
      <FlashMessage message={actionData?.error && actionData.intent !== "create_holiday" && actionData.intent !== "update_holiday" ? actionData.error : null} variant="error" />

      {/* Year navigator */}
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

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "TOTAL",    value: holidays.length,  color: "var(--accent)" },
          { label: "NATIONAL", value: nationalCount,    color: "var(--ok)" },
          { label: "OPTIONAL", value: optionalCount,    color: "var(--warn)" },
          { label: "COMPANY",  value: companyCount,     color: "var(--accent-dark)" },
        ].map(({ label, value, color }) => (
          <IcyCard key={label} className="hard-shadow">
            <IcyCardBody className="py-4 text-center">
              <p
                className="display text-3xl font-bold tnum"
                style={{ color }}
              >
                {String(value).padStart(2, "0")}
              </p>
              <p className="eyebrow mt-1">{label}</p>
            </IcyCardBody>
          </IcyCard>
        ))}
      </div>

      {/* Month-grouped holiday list */}
      {holidays.length === 0 ? (
        <IcyCard className="hard-shadow">
          <IcyCardBody className="py-16 text-center">
            <p className="text-ink-2 text-sm">
              No holidays for {year}.
              {hrUser && (
                <>
                  {" "}
                  <button
                    type="button"
                    onClick={openAdd}
                    className="underline text-accent"
                  >
                    Add one
                  </button>
                  .
                </>
              )}
            </p>
          </IcyCardBody>
        </IcyCard>
      ) : (
        <div className="space-y-4">
          {MONTH_NAMES.map((monthName, monthIdx) => {
            const rows = grouped.get(monthIdx);
            if (!rows || rows.length === 0) return null;
            return (
              <IcyCard key={monthName}>
                <IcyCardHeader>
                  <h2 className="eyebrow">{monthName.toUpperCase()}</h2>
                </IcyCardHeader>
                <IcyCardBody className="p-0">
                  <ul>
                    {rows.map((h) => {
                      const d = new Date(h.date + "T00:00:00");
                      const deleting =
                        isSubmitting &&
                        currentIntent === "delete_holiday" &&
                        navigation.formData?.get("id") === h.id;

                      return (
                        <li
                          key={h.id}
                          className="px-5 py-3 flex items-center gap-4 rule-dashed first:border-t-0"
                        >
                          {/* Date block */}
                          <div className="bevel-sunken w-12 text-center py-1 shrink-0">
                            <p className="eyebrow">
                              {d
                                .toLocaleDateString("en-IN", { weekday: "short" })
                                .toUpperCase()}
                            </p>
                            <p className="text-lg font-bold text-ink leading-tight tnum">
                              {d.getDate()}
                            </p>
                          </div>

                          {/* Name + description */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <span className="text-sm font-bold text-ink">
                                {h.name}
                              </span>
                              <Badge variant={typeBadgeVariant(h.type)} size="sm">
                                {h.type}
                              </Badge>
                            </div>
                            {h.description && (
                              <p className="eyebrow text-ink-2 truncate">
                                {h.description}
                              </p>
                            )}
                          </div>

                          {/* HR actions */}
                          {hrUser && (
                            <div className="flex items-center gap-3 shrink-0">
                              <button
                                type="button"
                                onClick={() => openEdit(h)}
                                className="eyebrow text-ink-2 hover:text-ink transition-colors"
                                aria-label={`Edit ${h.name}`}
                              >
                                EDIT
                              </button>
                              <Form
                                method="post"
                                onSubmit={(e) => {
                                  if (
                                    !window.confirm(
                                      `Delete "${h.name}"? This cannot be undone.`
                                    )
                                  ) {
                                    e.preventDefault();
                                  }
                                }}
                              >
                                <input
                                  type="hidden"
                                  name="intent"
                                  value="delete_holiday"
                                />
                                <input type="hidden" name="id" value={h.id} />
                                <button
                                  type="submit"
                                  disabled={deleting}
                                  className="eyebrow hover:underline disabled:opacity-45 transition-colors"
                                  style={{ color: "var(--err)" }}
                                  aria-label={`Delete ${h.name}`}
                                >
                                  {deleting ? "…" : "DEL"}
                                </button>
                              </Form>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </IcyCardBody>
              </IcyCard>
            );
          })}
        </div>
      )}

      {/* Add / Edit modal panel */}
      {showForm && (
        <HolidayFormPanel
          editing={editingHoliday}
          onClose={closeForm}
          isSubmitting={isSubmitting}
          currentIntent={currentIntent}
          actionData={actionData}
        />
      )}
    </div>
  );
}

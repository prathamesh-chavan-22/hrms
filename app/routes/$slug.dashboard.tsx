import { useLoaderData, data, Link } from "react-router";
import { useState } from "react";
import type { Route } from "./+types/$slug.dashboard";
import { requireTenantAccess } from "~/lib/auth.server";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { getPlan } from "~/lib/plans";
import { IcyCard, IcyCardBody, IcyCardHeader } from "~/components/IcyCard";
import { Badge, statusBadge } from "~/components/Badge";
import { AttendanceCalendar } from "~/components/AttendanceCalendar";
import {
  getMonthAttendance,
  getTodayAttendance,
  todayIST,
} from "~/lib/attendance.server";
import type { Tenant } from "~/types/app";
import type { DayMarker } from "~/components/AttendanceCalendar";

export function meta() {
  return [{ title: "Dashboard — Glacia HRMS" }];
}

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const slug = params.slug!;
  const env = context.cloudflare.env;
  const { profile, tenant } = await requireTenantAccess(request, env, slug);
  const { supabase } = createSupabaseServerClient(request, env);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = todayIST();

  const [employeesRes, holidaysRes, countRes, monthAttendance, todayRecord] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, role, status, department, designation, created_at")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("holidays")
        .select("id, name, date, type")
        .eq("tenant_id", tenant.id)
        .gte("date", `${year}-${String(month).padStart(2, "0")}-01`)
        .lte("date", `${year}-12-31`)
        .order("date")
        .limit(12),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant.id),
      getMonthAttendance(supabase, tenant.id, profile.id, year, month),
      getTodayAttendance(supabase, tenant.id, profile.id),
    ]);

  type EmployeeRow = { id: string; full_name: string; role: string; status: string; department: string | null; designation: string | null; created_at: string };
  type HolidayRow = { id: string; name: string; date: string; type: string };

  return data({
    profile,
    tenant,
    recentEmployees: (employeesRes.data ?? []) as EmployeeRow[],
    upcomingHolidays: (holidaysRes.data ?? []) as HolidayRow[],
    totalEmployees: countRes.count ?? 0,
    monthAttendance,
    todayRecord,
    calYear: year,
    calMonth: month,
    today,
    allHolidays: (holidaysRes.data ?? []) as HolidayRow[],
  });
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  tag: string;
}

function StatCard({ label, value, sub, tag }: StatCardProps) {
  return (
    <div className="bevel p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="eyebrow">{label}</p>
        <span className="chip chip-accent">{tag}</span>
      </div>
      <p className="display text-3xl text-ink tnum">{value}</p>
      {sub && <p className="eyebrow mt-1.5">{sub}</p>}
    </div>
  );
}

function fmt(ts: string | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function durHours(a: string | null, b: string | null): string {
  if (!a || !b) return "";
  const ms = new Date(b).getTime() - new Date(a).getTime();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

export default function DashboardPage() {
  const {
    profile,
    tenant,
    recentEmployees,
    upcomingHolidays,
    totalEmployees,
    monthAttendance,
    todayRecord,
    calYear,
    calMonth,
    today,
    allHolidays,
  } = useLoaderData<typeof loader>();

  const plan = getPlan(tenant.plan);
  const isHR = ["owner", "hr", "admin"].includes(profile.role);

  const [selectedDate, setSelectedDate] = useState<string | null>(today);

  // Build calendar markers: attendance records + holidays
  const markers: DayMarker[] = [
    ...monthAttendance.map(
      (r): DayMarker => ({
        date: r.date,
        kind: r.status as DayMarker["kind"],
        punch_in_at: r.punch_in_at,
        punch_out_at: r.punch_out_at,
        punch_in_addr: r.punch_in_addr,
        punch_out_addr: r.punch_out_addr,
      })
    ),
    ...allHolidays.map(
      (h): DayMarker => ({
        date: h.date,
        kind: "holiday",
        label: h.name,
      })
    ),
  ];

  const selectedMarker = markers.find((m) => m.date === selectedDate);

  // Today's punch summary state
  const punchedIn = !!todayRecord?.punch_in_at;
  const punchedOut = !!todayRecord?.punch_out_at;
  const todayStatus = todayRecord?.status ?? null;

  function todayStatusText() {
    if (!punchedIn) return null;
    if (!punchedOut) return `IN ${fmt(todayRecord!.punch_in_at)} — NOT OUT YET`;
    return `${fmt(todayRecord!.punch_in_at)} → ${fmt(todayRecord!.punch_out_at)}  ·  ${durHours(todayRecord!.punch_in_at, todayRecord!.punch_out_at)}`;
  }

  return (
    <div className="p-5 lg:p-7 space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="eyebrow mb-2">DASHBOARD</p>
          <h1 className="display text-3xl text-ink">
            Good day, {profile.full_name.split(" ")[0]}.
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="chip">{tenant.name.toUpperCase()}</span>
          <span className="chip chip-accent">{plan.name.toUpperCase()}</span>
          <span className="chip tnum">{totalEmployees}/{plan.maxEmployees} STAFF</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="TOTAL EMPLOYEES"
          value={totalEmployees}
          sub={`OF ${plan.maxEmployees} IN ${plan.name.toUpperCase()}`}
          tag="HEAD"
        />
        <StatCard
          label="UPCOMING HOLIDAYS"
          value={String(upcomingHolidays.length).padStart(2, "0")}
          sub="NEXT MONTHS"
          tag="CAL"
        />
        <StatCard
          label="YOUR PLAN"
          value={plan.name}
          sub={plan.price === 0 ? "FREE TIER" : `₹${plan.price}/MO`}
          tag="TIER"
        />
        <StatCard
          label="TODAY ATTENDANCE"
          value={
            !punchedIn ? "—"
            : !punchedOut ? "IN"
            : `${durHours(todayRecord!.punch_in_at, todayRecord!.punch_out_at) || "OUT"}`
          }
          sub={
            !punchedIn
              ? tenant.gps_required ? "GPS REQUIRED" : "TAP TO PUNCH IN"
              : todayStatus?.toUpperCase() ?? "PRESENT"
          }
          tag="GEO"
        />
      </div>

      {/* Today punch strip */}
      <div className="bevel px-5 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="chip chip-accent eyebrow">TODAY</span>
          <span className="text-sm font-mono text-ink-2 tnum">{todayStatusText() ?? "NOT PUNCHED IN"}</span>
        </div>
        {!punchedIn ? (
          <Link
            to={`/${tenant.slug}/attendance`}
            className="bevel-accent bevel-press inline-flex items-center gap-2 px-5 py-2 font-mono font-bold uppercase tracking-[0.08em] text-xs"
          >
            → PUNCH IN
          </Link>
        ) : !punchedOut ? (
          <Link
            to={`/${tenant.slug}/attendance`}
            className="bevel bevel-press inline-flex items-center gap-2 px-5 py-2 font-mono font-bold uppercase tracking-[0.08em] text-xs text-ink"
          >
            → PUNCH OUT
          </Link>
        ) : (
          <span className="chip" style={{ backgroundColor: "var(--ok)", color: "#fff" }}>
            COMPLETE
          </span>
        )}
      </div>

      {/* Calendar + selected day detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <AttendanceCalendar
            markers={markers}
            initialYear={calYear}
            initialMonth={calMonth}
            selectedDate={selectedDate}
            onDayClick={(date, marker) => setSelectedDate(date === selectedDate ? null : date)}
          />
        </div>

        {/* Selected day detail */}
        <div>
          <IcyCard className="h-full">
            <IcyCardHeader>
              <h2 className="eyebrow">
                {selectedDate
                  ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", {
                      weekday: "long", day: "numeric", month: "long",
                    }).toUpperCase()
                  : "SELECT A DAY"}
              </h2>
            </IcyCardHeader>
            <IcyCardBody>
              {!selectedDate ? (
                <p className="text-ink-2 text-sm">Click any date on the calendar to see details.</p>
              ) : !selectedMarker ? (
                <p className="text-ink-2 text-sm">No record for this date.</p>
              ) : selectedMarker.kind === "holiday" ? (
                <div className="space-y-3">
                  <span className="chip" style={{ backgroundColor: "var(--accent-dark)", color: "#fff" }}>
                    HOLIDAY
                  </span>
                  <p className="text-sm font-bold text-ink">{selectedMarker.label}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <span
                    className="chip"
                    style={{
                      backgroundColor:
                        selectedMarker.kind === "present" ? "var(--ok)"
                        : selectedMarker.kind === "half_day" ? "var(--warn)"
                        : selectedMarker.kind === "absent" ? "var(--err)"
                        : "var(--accent)",
                      color: "#fff",
                    }}
                  >
                    {selectedMarker.kind.replace("_", " ").toUpperCase()}
                  </span>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="eyebrow">PUNCH IN</dt>
                      <dd className="text-ink tnum font-mono mt-0.5">{fmt(selectedMarker.punch_in_at ?? null)}</dd>
                      {selectedMarker.punch_in_addr && (
                        <dd className="text-ink-2 text-xs mt-0.5 truncate font-mono">{selectedMarker.punch_in_addr}</dd>
                      )}
                    </div>
                    <div>
                      <dt className="eyebrow">PUNCH OUT</dt>
                      <dd className="text-ink tnum font-mono mt-0.5">{fmt(selectedMarker.punch_out_at ?? null)}</dd>
                      {selectedMarker.punch_out_addr && (
                        <dd className="text-ink-2 text-xs mt-0.5 truncate font-mono">{selectedMarker.punch_out_addr}</dd>
                      )}
                    </div>
                    {selectedMarker.punch_in_at && selectedMarker.punch_out_at && (
                      <div>
                        <dt className="eyebrow">DURATION</dt>
                        <dd className="text-ink tnum font-mono mt-0.5">
                          {durHours(selectedMarker.punch_in_at, selectedMarker.punch_out_at)}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}
            </IcyCardBody>
          </IcyCard>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Employees (HR only) */}
        {isHR && (
          <IcyCard>
            <IcyCardHeader>
              <h2 className="eyebrow">RECENT TEAM MEMBERS</h2>
            </IcyCardHeader>
            <IcyCardBody className="p-0">
              {recentEmployees.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-ink-2 text-sm">No employees yet. Invite your team.</p>
                </div>
              ) : (
                <ul>
                  {recentEmployees.map((emp) => (
                    <li
                      key={emp.id}
                      className="px-5 py-3 flex items-center justify-between rule-dashed first:border-t-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bevel-accent w-8 h-8 flex items-center justify-center text-xs font-mono font-bold !shadow-none">
                          {emp.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-ink">{emp.full_name}</p>
                          <p className="eyebrow mt-0.5">
                            {(emp.designation ?? emp.department ?? "—").toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <Badge {...statusBadge(emp.status as "active" | "inactive" | "invited")} size="sm">
                        {emp.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </IcyCardBody>
          </IcyCard>
        )}

        {/* Upcoming Holidays */}
        <IcyCard>
          <IcyCardHeader>
            <h2 className="eyebrow">UPCOMING HOLIDAYS</h2>
          </IcyCardHeader>
          <IcyCardBody className="p-0">
            {upcomingHolidays.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-ink-2 text-sm">No upcoming holidays.</p>
              </div>
            ) : (
              <ul>
                {upcomingHolidays.slice(0, 5).map((h) => {
                  const d = new Date(h.date + "T00:00:00");
                  return (
                    <li
                      key={h.id}
                      className="px-5 py-3 flex items-center gap-4 rule-dashed first:border-t-0"
                    >
                      <div className="bevel-sunken w-12 text-center py-1">
                        <p className="eyebrow">
                          {d.toLocaleDateString("en-IN", { month: "short" }).toUpperCase()}
                        </p>
                        <p className="text-lg font-bold text-ink leading-tight tnum">{d.getDate()}</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-ink">{h.name}</p>
                        <p className="eyebrow mt-0.5">{h.type}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </IcyCardBody>
        </IcyCard>
      </div>
    </div>
  );
}

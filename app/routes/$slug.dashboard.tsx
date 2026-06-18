import { useLoaderData, useOutletContext, data, Link } from "react-router";
import { useState } from "react";
import type { Route } from "./+types/$slug.dashboard";
import { requireChildLoaderAuth } from "~/lib/auth.server";
import type { TenantOutletContext } from "./$slug";
import { getPlan } from "~/lib/plans";
import { IcyCard, IcyCardBody, IcyCardHeader } from "~/components/IcyCard";
import { Badge, statusBadge } from "~/components/Badge";
import { AttendanceCalendar } from "~/components/AttendanceCalendar";
import {
  getMonthAttendance,
  getTodayAttendance,
  todayIST,
} from "~/lib/attendance.server";
import { fmtTime, durHours } from "~/lib/format";
import { isHR } from "~/lib/roles";
import { StatCard } from "~/components/dashboard/StatCard";
import { buildAttendanceMarkers } from "~/lib/attendance-markers";

export function meta() {
  return [{ title: "Dashboard — Glacia HRMS" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const { userId, tenantId, supabase } = await requireChildLoaderAuth(request, env);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = todayIST();

  const [employeesRes, upcomingHolidaysRes, countRes, monthAttendance, todayRecord] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, role, status, department, designation, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("holidays")
        .select("id, name, date, type")
        .eq("tenant_id", tenantId)
        .gte("date", today)
        .order("date")
        .limit(5),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId),
      getMonthAttendance(supabase, tenantId, userId, year, month),
      getTodayAttendance(supabase, tenantId, userId),
    ]);

  type EmployeeRow = { id: string; full_name: string; role: string; status: string; department: string | null; designation: string | null; created_at: string };
  type HolidayRow = { id: string; name: string; date: string; type: string };

  return data({
    recentEmployees: (employeesRes.data ?? []) as EmployeeRow[],
    upcomingHolidays: (upcomingHolidaysRes.data ?? []) as HolidayRow[],
    totalEmployees: countRes.count ?? 0,
    monthAttendance,
    todayRecord,
    calYear: year,
    calMonth: month,
    today,
  });
}

export default function DashboardPage() {
  const { profile, tenant } = useOutletContext<TenantOutletContext>();
  const {
    recentEmployees,
    upcomingHolidays,
    totalEmployees,
    monthAttendance,
    todayRecord,
    calYear,
    calMonth,
    today,
  } = useLoaderData<typeof loader>();

  const plan = getPlan(tenant.plan);
  const hrUser = isHR(profile.role);

  const [selectedDate, setSelectedDate] = useState<string | null>(today);

  const calMonthPrefix = `${calYear}-${String(calMonth).padStart(2, "0")}`;

  const markers = buildAttendanceMarkers(monthAttendance, upcomingHolidays, calMonthPrefix);

  const selectedMarker = markers.find((m) => m.date === selectedDate);

  // Today's punch summary state
  const punchedIn = !!todayRecord?.punch_in_at;
  const punchedOut = !!todayRecord?.punch_out_at;
  const todayStatus = todayRecord?.status ?? null;

  function todayStatusText() {
    if (!punchedIn) return null;
    if (!punchedOut) return `IN ${fmtTime(todayRecord!.punch_in_at)} — NOT OUT YET`;
    return `${fmtTime(todayRecord!.punch_in_at)} → ${fmtTime(todayRecord!.punch_out_at)}  ·  ${durHours(todayRecord!.punch_in_at, todayRecord!.punch_out_at)}`;
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
            onDayClick={(date, _marker) => setSelectedDate(date === selectedDate ? null : date)}
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
                      <dd className="text-ink tnum font-mono mt-0.5">{fmtTime(selectedMarker.punch_in_at ?? null)}</dd>
                      {selectedMarker.punch_in_addr && (
                        <dd className="text-ink-2 text-xs mt-0.5 truncate font-mono">{selectedMarker.punch_in_addr}</dd>
                      )}
                    </div>
                    <div>
                      <dt className="eyebrow">PUNCH OUT</dt>
                      <dd className="text-ink tnum font-mono mt-0.5">{fmtTime(selectedMarker.punch_out_at ?? null)}</dd>
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
        {hrUser && (
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
                {upcomingHolidays.map((h) => {
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

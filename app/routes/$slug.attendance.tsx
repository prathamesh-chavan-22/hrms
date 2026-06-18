import { data, useLoaderData, useOutletContext, useSearchParams } from "react-router";
import { useState } from "react";
import type { Route } from "./+types/$slug.attendance";
import { requireChildLoaderAuth } from "~/lib/auth.server";
import type { TenantOutletContext } from "./$slug";
import { AttendanceCalendar } from "~/components/AttendanceCalendar";
import { AttendanceMap } from "~/components/AttendanceMap";
import type { MapMarker } from "~/components/AttendanceMap";
import {
  getMonthAttendance,
  getTodayAttendance,
  getTeamAttendanceToday,
  todayIST,
} from "~/lib/attendance.server";
import { isHR } from "~/lib/roles";
import { IcyCard, IcyCardBody, IcyCardHeader } from "~/components/IcyCard";
import { fmtTime, durHours } from "~/lib/format";
import { buildAttendanceMarkers, getStatusColor, formatStatusLabel } from "~/lib/attendance-markers";
import { dispatchIntent } from "~/lib/actions/intent-handler.server";
import { attendanceIntentHandlers } from "~/lib/actions/attendance/handlers.server";
import { getIntent } from "~/lib/validation/form-data";
import { PunchPanel } from "~/components/attendance/PunchPanel";
import { AttendanceDayDetails } from "~/components/attendance/AttendanceDayDetails";
import { TeamAttendanceTable } from "~/components/attendance/TeamAttendanceTable";

export function meta() {
  return [{ title: "Attendance — Glacia HRMS" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const { userId, tenantId, role, supabase } = await requireChildLoaderAuth(request, env);

  const url = new URL(request.url);
  const qYear = parseInt(url.searchParams.get("year") ?? "") || new Date().getFullYear();
  const qMonth = parseInt(url.searchParams.get("month") ?? "") || new Date().getMonth() + 1;
  const hrUser = isHR(role);

  const [monthAttendance, todayRecord, teamToday] = await Promise.all([
    getMonthAttendance(supabase, tenantId, userId, qYear, qMonth),
    getTodayAttendance(supabase, tenantId, userId),
    hrUser ? getTeamAttendanceToday(supabase, tenantId) : Promise.resolve([]),
  ]);

  return data({
    monthAttendance,
    todayRecord,
    teamToday,
    calYear: qYear,
    calMonth: qMonth,
    today: todayIST(),
    isHR: hrUser,
  });
}

export async function action({ params, request, context }: Route.ActionArgs) {
  const form = await request.formData();
  const intent = getIntent(form);

  if (!attendanceIntentHandlers[intent]) {
    return data({ error: "Unknown intent", success: null, intent });
  }

  return dispatchIntent(intent, attendanceIntentHandlers, {
    request,
    form,
    env: context.cloudflare.env,
    params,
  });
}

export default function AttendancePage() {
  const { tenant } = useOutletContext<TenantOutletContext>();
  const {
    monthAttendance,
    todayRecord,
    teamToday,
    calYear,
    calMonth,
    today,
    isHR: hrUser,
  } = useLoaderData<typeof loader>();

  const [, setSearchParams] = useSearchParams();
  const [selectedDate, setSelectedDate] = useState<string | null>(today);

  const markers = buildAttendanceMarkers(monthAttendance);

  const selectedRecord = monthAttendance.find((r) => r.date === selectedDate);

  function handleMonthNav(year: number, month: number) {
    setSearchParams({ year: String(year), month: String(month) });
  }

  return (
    <div className="p-5 lg:p-7 space-y-6">
      <div>
        <p className="eyebrow mb-2">ATTENDANCE</p>
        <h1 className="display text-3xl text-ink">Punch in/out with GPS</h1>
      </div>

      <PunchPanel today={today} todayRecord={todayRecord} gpsRequired={tenant.gps_required} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <AttendanceCalendar
            markers={markers}
            initialYear={calYear}
            initialMonth={calMonth}
            selectedDate={selectedDate}
            onDayClick={(date) => setSelectedDate(date === selectedDate ? null : date)}
            onMonthChange={handleMonthNav}
          />
        </div>

        <AttendanceDayDetails selectedDate={selectedDate} record={selectedRecord} />
      </div>

      <IcyCard>
        <IcyCardHeader>
          <h2 className="eyebrow">
            THIS MONTH — {calYear}/{String(calMonth).padStart(2, "0")}
          </h2>
        </IcyCardHeader>
        <IcyCardBody className="p-0">
          {monthAttendance.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-ink-2 text-sm">No attendance records yet this month.</p>
            </div>
          ) : (
            <ul>
              {monthAttendance.map((r) => {
                const d = new Date(r.date + "T00:00:00");
                return (
                  <li
                    key={r.id || r.date}
                    className="px-5 py-3 flex items-center gap-4 rule-dashed first:border-t-0"
                    onClick={() => setSelectedDate(r.date)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="bevel-sunken w-14 text-center py-1 shrink-0">
                      <p className="eyebrow">
                        {d.toLocaleDateString("en-IN", { weekday: "short" }).toUpperCase()}
                      </p>
                      <p className="text-lg font-bold text-ink leading-tight tnum">{d.getDate()}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className="chip"
                          style={{ backgroundColor: getStatusColor(r.status), color: "#fff" }}
                        >
                          {formatStatusLabel(r.status)}
                        </span>
                        {r.punch_in_at && r.punch_out_at && (
                          <span className="chip tnum">
                            {durHours(r.punch_in_at, r.punch_out_at)}
                          </span>
                        )}
                      </div>
                      <p className="eyebrow text-ink-2">
                        {fmtTime(r.punch_in_at)} → {fmtTime(r.punch_out_at)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </IcyCardBody>
      </IcyCard>

      {hrUser && (
        <>
          <TeamAttendanceTable teamToday={teamToday} today={today} />
          {teamToday.length > 0 && (
            <div>
              <p className="eyebrow mb-3">PUNCH-IN LOCATIONS TODAY</p>
              <AttendanceMap
                markers={teamToday
                  .filter((r) => r.punch_in_lat != null && r.punch_in_lng != null)
                  .map(
                    (r): MapMarker => ({
                      lat: r.punch_in_lat!,
                      lng: r.punch_in_lng!,
                      name: r.profile.full_name,
                      time: fmtTime(r.punch_in_at),
                      addr: r.punch_in_addr,
                    })
                  )}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

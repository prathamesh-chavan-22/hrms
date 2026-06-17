import { data, Form, useLoaderData, useOutletContext, useActionData, useNavigation, useSearchParams } from "react-router";
import { useState, useEffect, useRef } from "react";
import type { Route } from "./+types/$slug.attendance";
import { requireTenantAccess, requireChildLoaderAuth } from "~/lib/auth.server";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import type { TenantOutletContext } from "./$slug";
import { IcyCard, IcyCardBody, IcyCardHeader } from "~/components/IcyCard";
import { Button } from "~/components/Button";
import { AttendanceCalendar } from "~/components/AttendanceCalendar";
import { AttendanceMap } from "~/components/AttendanceMap";
import type { MapMarker } from "~/components/AttendanceMap";
import {
  getMonthAttendance,
  getTodayAttendance,
  getTeamAttendanceToday,
  punchIn,
  punchOut,
  requireValidCoords,
  setAttendanceStatus,
  todayIST,
} from "~/lib/attendance.server";
import type { DayMarker } from "~/components/AttendanceCalendar";
import { fmtTime, durHours } from "~/lib/format";
import { isHR } from "~/lib/roles";
import { FlashMessage } from "~/components/FlashMessage";

export function meta() {
  return [{ title: "Attendance — Glacia HRMS" }];
}

export async function loader({ params, request, context }: Route.LoaderArgs) {
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
  const slug = params.slug!;
  const env = context.cloudflare.env;
  const { profile, tenant } = await requireTenantAccess(request, env, slug);
  const { supabase } = createSupabaseServerClient(request, env);
  const form = await request.formData();
  const intent = String(form.get("intent"));

  if (intent === "punch_in" || intent === "punch_out") {
    const latRaw = parseFloat(String(form.get("lat")));
    const lngRaw = parseFloat(String(form.get("lng")));
    const lat = Number.isFinite(latRaw) ? latRaw : null;
    const lng = Number.isFinite(lngRaw) ? lngRaw : null;
    const addr = String(form.get("addr") || "") || null;

    const coordError = requireValidCoords(tenant.gps_required, lat, lng);
    if (coordError) return data({ error: coordError, success: null, intent });

    const punch = intent === "punch_in" ? punchIn : punchOut;
    const { error } = await punch(supabase, {
      tenantId: tenant.id,
      userId: profile.id,
      gpsRequired: tenant.gps_required,
      lat,
      lng,
      addr,
    });
    const label = intent === "punch_in" ? "Punched in" : "Punched out";
    return data({ error: error ?? null, success: error ? null : `${label} successfully`, intent });
  }

  if (intent === "set_status") {
    if (!isHR(profile.role)) return data({ error: "Unauthorized", success: null, intent }, { status: 403 });

    const userId = String(form.get("user_id"));
    const date = String(form.get("date"));
    const status = String(form.get("status"));
    const note = String(form.get("note") || "");

    // Verify the target user belongs to this tenant before writing.
    const { data: target } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    if (!target) return data({ error: "Invalid user", success: null, intent }, { status: 400 });

    const { error } = await setAttendanceStatus(supabase, {
      tenantId: tenant.id,
      userId,
      date,
      status,
      note,
    });
    return data({ error: error ?? null, success: error ? null : "Status updated", intent });
  }

  return data({ error: "Unknown intent", success: null, intent });
}

// GPS-gated punch panel (client component)
function PunchPanel({
  today,
  todayRecord,
  gpsRequired,
}: {
  today: string;
  todayRecord: ReturnType<typeof useLoaderData<typeof loader>>["todayRecord"];
  gpsRequired: boolean;
}) {
  const navigation = useNavigation();
  const actionData = useActionData<typeof action>();

  const [gpsStatus, setGpsStatus] = useState<"idle" | "acquiring" | "locked" | "error">("idle");
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number; addr: string | null } | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const isSubmitting = navigation.state === "submitting";

  const punchedIn = !!todayRecord?.punch_in_at;
  const punchedOut = !!todayRecord?.punch_out_at;
  const canPunchIn = !punchedIn;
  const canPunchOut = punchedIn && !punchedOut;

  async function acquireGPS() {
    setGpsStatus("acquiring");
    setGpsError(null);
    try {
      // Dynamic import to avoid SSR
      const { getCurrentPosition, geoErrorMessage } = await import("~/lib/geolocation.client");
      const result = await getCurrentPosition();
      setCoords(result);
      setGpsStatus("locked");
    } catch (err: unknown) {
      const { geoErrorMessage } = await import("~/lib/geolocation.client");
      const msg = err instanceof Error ? geoErrorMessage(err.message) : "Location error";
      setGpsError(msg);
      setGpsStatus("error");
    }
  }

  const gpsReady = !gpsRequired || gpsStatus === "locked";
  const submitDisabled = isSubmitting || !gpsReady;

  const [clock, setClock] = useState(() => {
    const now = new Date();
    return now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  });

  useEffect(() => {
    const id = setInterval(() => {
      setClock(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <IcyCard className="hard-shadow">
      <IcyCardHeader>
        <h2 className="eyebrow">PUNCH IN / OUT</h2>
      </IcyCardHeader>
      <IcyCardBody>
        {/* Live clock */}
        <p className="display text-5xl text-ink tnum mb-1">{clock}</p>
        <p className="eyebrow mb-6">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).toUpperCase()}
        </p>

        {/* Today status */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="bevel-sunken px-4 py-3 min-w-28">
            <p className="eyebrow mb-1">PUNCH IN</p>
            <p className="tnum font-mono text-ink font-bold">{fmtTime(todayRecord?.punch_in_at ?? null)}</p>
          </div>
          <div className="bevel-sunken px-4 py-3 min-w-28">
            <p className="eyebrow mb-1">PUNCH OUT</p>
            <p className="tnum font-mono text-ink font-bold">{fmtTime(todayRecord?.punch_out_at ?? null)}</p>
          </div>
          {todayRecord?.punch_in_at && todayRecord?.punch_out_at && (
            <div className="bevel-sunken px-4 py-3 min-w-28">
              <p className="eyebrow mb-1">DURATION</p>
              <p className="tnum font-mono text-ink font-bold">{durHours(todayRecord.punch_in_at, todayRecord.punch_out_at)}</p>
            </div>
          )}
        </div>

        {/* GPS acquire */}
        {gpsRequired && (
          <div className="mb-4">
            {gpsStatus === "idle" && (
              <button
                type="button"
                onClick={acquireGPS}
                className="bevel bevel-press px-4 py-2 font-mono font-bold uppercase tracking-[0.08em] text-xs text-ink"
              >
                ◎ ACQUIRE GPS LOCK
              </button>
            )}
            {gpsStatus === "acquiring" && (
              <span className="chip eyebrow">
                <span className="inline-block w-2.5 h-2.5 border-2 border-current border-t-transparent animate-spin mr-1.5" />
                ACQUIRING GPS...
              </span>
            )}
            {gpsStatus === "locked" && coords && (
              <span className="chip" style={{ backgroundColor: "var(--ok)", color: "#fff" }}>
                ✓ GPS LOCK · {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
              </span>
            )}
            {gpsStatus === "error" && (
              <div className="bevel-sunken px-4 py-2.5 border-l-4" style={{ borderLeftColor: "var(--err)" }}>
                <p className="text-xs font-mono" style={{ color: "var(--err)" }}>{gpsError}</p>
                <button type="button" onClick={acquireGPS} className="eyebrow mt-1 underline">
                  RETRY
                </button>
              </div>
            )}
          </div>
        )}

        {!gpsRequired && (
          <div className="mb-4">
            <span className="chip eyebrow">GPS OFF — LOCATION NOT REQUIRED</span>
          </div>
        )}

        {/* Feedback */}
        <FlashMessage message={actionData?.error} variant="error" />
        <FlashMessage message={actionData?.success} variant="success" />

        {/* Action buttons */}
        <Form method="post" ref={formRef}>
          <input type="hidden" name="lat" value={coords?.lat ?? ""} />
          <input type="hidden" name="lng" value={coords?.lng ?? ""} />
          <input type="hidden" name="addr" value={coords?.addr ?? ""} />
          <div className="flex flex-wrap gap-3">
            {canPunchIn && (
              <Button
                type="submit"
                name="intent"
                value="punch_in"
                size="lg"
                disabled={submitDisabled}
                loading={isSubmitting && navigation.formData?.get("intent") === "punch_in"}
              >
                PUNCH IN
              </Button>
            )}
            {canPunchOut && (
              <Button
                type="submit"
                name="intent"
                value="punch_out"
                variant="secondary"
                size="lg"
                disabled={submitDisabled}
                loading={isSubmitting && navigation.formData?.get("intent") === "punch_out"}
              >
                PUNCH OUT
              </Button>
            )}
            {punchedIn && punchedOut && (
              <span className="bevel px-6 py-3 font-mono font-bold uppercase tracking-[0.08em] text-sm text-ink eyebrow">
                ✓ COMPLETE FOR TODAY
              </span>
            )}
          </div>
        </Form>
      </IcyCardBody>
    </IcyCard>
  );
}

export default function AttendancePage() {
  const { profile, tenant } = useOutletContext<TenantOutletContext>();
  const {
    monthAttendance,
    todayRecord,
    teamToday,
    calYear,
    calMonth,
    today,
    isHR,
  } = useLoaderData<typeof loader>();

  const [, setSearchParams] = useSearchParams();
  const [selectedDate, setSelectedDate] = useState<string | null>(today);

  const markers: DayMarker[] = monthAttendance.map(
    (r): DayMarker => ({
      date: r.date,
      kind: r.status as DayMarker["kind"],
      punch_in_at: r.punch_in_at,
      punch_out_at: r.punch_out_at,
      punch_in_addr: r.punch_in_addr,
      punch_out_addr: r.punch_out_addr,
    })
  );

  const selectedRecord = monthAttendance.find((r) => r.date === selectedDate);

  function handleMonthNav(year: number, month: number) {
    setSearchParams({ year: String(year), month: String(month) });
  }

  const statusColors: Record<string, string> = {
    present: "var(--ok)",
    half_day: "var(--warn)",
    absent: "var(--err)",
    wfh: "var(--accent)",
  };

  return (
    <div className="p-5 lg:p-7 space-y-6">
      {/* Header */}
      <div>
        <p className="eyebrow mb-2">ATTENDANCE</p>
        <h1 className="display text-3xl text-ink">Punch in/out with GPS</h1>
      </div>

      {/* Punch panel */}
      <PunchPanel
        today={today}
        todayRecord={todayRecord}
        gpsRequired={tenant.gps_required}
      />

      {/* Calendar + history */}
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

        {/* Selected day detail */}
        <IcyCard className="h-full">
          <IcyCardHeader>
            <h2 className="eyebrow">
              {selectedDate
                ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", {
                    weekday: "short", day: "numeric", month: "short",
                  }).toUpperCase()
                : "SELECT A DAY"}
            </h2>
          </IcyCardHeader>
          <IcyCardBody>
            {!selectedDate ? (
              <p className="text-ink-2 text-sm">Click a day to view details.</p>
            ) : !selectedRecord ? (
              <p className="text-ink-2 text-sm">No record.</p>
            ) : (
              <div className="space-y-3">
                <span
                  className="chip"
                  style={{ backgroundColor: statusColors[selectedRecord.status] ?? "var(--muted)", color: "#fff" }}
                >
                  {selectedRecord.status.replace("_", " ").toUpperCase()}
                </span>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="eyebrow">PUNCH IN</dt>
                    <dd className="tnum font-mono text-ink mt-0.5">{fmtTime(selectedRecord.punch_in_at)}</dd>
                    {selectedRecord.punch_in_addr && (
                      <dd className="text-xs text-ink-2 font-mono mt-0.5 break-words">{selectedRecord.punch_in_addr}</dd>
                    )}
                  </div>
                  <div>
                    <dt className="eyebrow">PUNCH OUT</dt>
                    <dd className="tnum font-mono text-ink mt-0.5">{fmtTime(selectedRecord.punch_out_at)}</dd>
                    {selectedRecord.punch_out_addr && (
                      <dd className="text-xs text-ink-2 font-mono mt-0.5 break-words">{selectedRecord.punch_out_addr}</dd>
                    )}
                  </div>
                  {selectedRecord.punch_in_at && selectedRecord.punch_out_at && (
                    <div>
                      <dt className="eyebrow">DURATION</dt>
                      <dd className="tnum font-mono text-ink mt-0.5">
                        {durHours(selectedRecord.punch_in_at, selectedRecord.punch_out_at)}
                      </dd>
                    </div>
                  )}
                  {selectedRecord.note && (
                    <div>
                      <dt className="eyebrow">NOTE</dt>
                      <dd className="text-ink-2 text-xs mt-0.5">{selectedRecord.note}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </IcyCardBody>
        </IcyCard>
      </div>

      {/* Monthly history list */}
      <IcyCard>
        <IcyCardHeader>
          <h2 className="eyebrow">THIS MONTH — {calYear}/{String(calMonth).padStart(2, "0")}</h2>
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
                      <p className="eyebrow">{d.toLocaleDateString("en-IN", { weekday: "short" }).toUpperCase()}</p>
                      <p className="text-lg font-bold text-ink leading-tight tnum">{d.getDate()}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className="chip"
                          style={{ backgroundColor: statusColors[r.status] ?? "var(--muted)", color: "#fff" }}
                        >
                          {r.status.replace("_", " ").toUpperCase()}
                        </span>
                        {r.punch_in_at && r.punch_out_at && (
                          <span className="chip tnum">{durHours(r.punch_in_at, r.punch_out_at)}</span>
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

      {/* HR team view */}
      {isHR && teamToday.length > 0 && (
        <>
          <IcyCard>
            <IcyCardHeader>
              <h2 className="eyebrow">TEAM TODAY — {today}</h2>
            </IcyCardHeader>
            <IcyCardBody className="p-0">
              <ul>
                {teamToday.map((row) => (
                  <li key={row.user_id} className="px-5 py-3 flex flex-wrap items-center gap-3 rule-dashed first:border-t-0">
                    <div className="bevel-accent w-8 h-8 flex items-center justify-center text-xs font-mono font-bold shrink-0">
                      {row.profile.full_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-ink">{row.profile.full_name}</p>
                      <p className="eyebrow mt-0.5">
                        {(row.profile.designation ?? row.profile.department ?? "—").toUpperCase()}
                      </p>
                    </div>
                    <span
                      className="chip"
                      style={{
                        backgroundColor: row.punch_in_at
                          ? row.punch_out_at ? "var(--ok)" : "var(--warn)"
                          : "var(--muted)",
                        color: "#fff",
                      }}
                    >
                      {row.punch_in_at ? (row.punch_out_at ? "COMPLETE" : "IN") : "NOT IN"}
                    </span>
                    <div className="shrink-0 text-right">
                      <p className="tnum font-mono text-xs text-ink-2">{fmtTime(row.punch_in_at)} → {fmtTime(row.punch_out_at)}</p>
                      {row.punch_in_at && row.punch_out_at && (
                        <p className="tnum font-mono text-xs text-muted">{durHours(row.punch_in_at, row.punch_out_at)}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </IcyCardBody>
          </IcyCard>

          {/* Location map */}
          <div>
            <p className="eyebrow mb-3">PUNCH-IN LOCATIONS TODAY</p>
            <AttendanceMap
              markers={teamToday
                .filter((r) => r.punch_in_lat != null && r.punch_in_lng != null)
                .map((r): MapMarker => ({
                  lat: r.punch_in_lat!,
                  lng: r.punch_in_lng!,
                  name: r.profile.full_name,
                  time: fmtTime(r.punch_in_at),
                  addr: r.punch_in_addr,
                }))}
            />
          </div>
        </>
      )}
    </div>
  );
}

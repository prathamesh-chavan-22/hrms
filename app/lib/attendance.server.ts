import type { SupabaseClient } from "~/lib/supabase.server";
import { todayIST } from "~/lib/dates";
export { todayIST };

/** Max age of a browser-reported GPS fix before punch submission (ms). */
export const GPS_MAX_AGE_MS = 3 * 60 * 1000;

/** Reject fixes coarser than this when GPS is required (meters). */
export const GPS_MAX_ACCURACY_M = 5_000;

export type GpsSubmission = {
  lat: number | null;
  lng: number | null;
  addr: string | null;
  /** Epoch ms from GeolocationPosition.timestamp — still client-controlled. */
  capturedAt: number | null;
  /** Meters from GeolocationPosition.coords.accuracy — still client-controlled. */
  accuracyM: number | null;
};

/**
 * Browser GPS is client-reported audit data, not a tamper-proof anti-fraud control.
 * Crafted requests can spoof lat/lng, capturedAt, and accuracy. Validation here only
 * enforces presence, sane ranges, and freshness for honest clients.
 */
export function normalizeGpsSubmission(
  gpsRequired: boolean,
  raw: GpsSubmission,
): { coords: GpsSubmission; error: string | null } {
  if (!gpsRequired) {
    return {
      coords: { lat: null, lng: null, addr: null, capturedAt: null, accuracyM: null },
      error: null,
    };
  }

  const { lat, lng, addr, capturedAt, accuracyM } = raw;

  if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
    return { coords: raw, error: "GPS location is required for this tenant" };
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { coords: raw, error: "Invalid GPS coordinates" };
  }
  if (capturedAt == null || Number.isNaN(capturedAt)) {
    return { coords: raw, error: "GPS lock expired — acquire a fresh location and retry" };
  }
  const ageMs = Date.now() - capturedAt;
  if (ageMs < 0 || ageMs > GPS_MAX_AGE_MS) {
    return { coords: raw, error: "GPS lock expired — acquire a fresh location and retry" };
  }
  if (accuracyM != null && !Number.isNaN(accuracyM) && accuracyM > GPS_MAX_ACCURACY_M) {
    return { coords: raw, error: "GPS accuracy too low — move to an open area and retry" };
  }

  return { coords: { lat, lng, addr, capturedAt, accuracyM }, error: null };
}

export function monthBounds(year: number, month: number): { start: string; end: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = `${year}-${pad(month)}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${pad(month)}-${pad(lastDay)}`;
  return { start, end };
}

export type AttendanceRow = {
  id: string;
  date: string;
  punch_in_at: string | null;
  punch_in_lat: number | null;
  punch_in_lng: number | null;
  punch_in_addr: string | null;
  punch_out_at: string | null;
  punch_out_lat: number | null;
  punch_out_lng: number | null;
  punch_out_addr: string | null;
  status: string;
  note: string | null;
};

export type TeamAttendanceRow = AttendanceRow & {
  user_id: string;
  profile: { full_name: string; department: string | null; designation: string | null };
};

export async function getMonthAttendance(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string,
  year: number,
  month: number
): Promise<AttendanceRow[]> {
  const { start, end } = monthBounds(year, month);
  const { data } = await supabase
    .from("attendance")
    .select(
      "id, date, punch_in_at, punch_in_lat, punch_in_lng, punch_in_addr, punch_out_at, punch_out_lat, punch_out_lng, punch_out_addr, status, note"
    )
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .gte("date", start)
    .lte("date", end)
    .order("date");
  return (data ?? []) as AttendanceRow[];
}

export async function getTodayAttendance(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string
): Promise<AttendanceRow | null> {
  const today = todayIST();
  const { data } = await supabase
    .from("attendance")
    .select(
      "id, date, punch_in_at, punch_in_lat, punch_in_lng, punch_in_addr, punch_out_at, punch_out_lat, punch_out_lng, punch_out_addr, status, note"
    )
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();
  return data as AttendanceRow | null;
}

export async function getTeamAttendanceToday(
  supabase: SupabaseClient,
  tenantId: string
): Promise<TeamAttendanceRow[]> {
  const today = todayIST();
  const { data } = await supabase
    .from("profiles")
    .select(
      `id, full_name, department, designation,
       attendance!left (
         id, date, punch_in_at, punch_in_lat, punch_in_lng, punch_in_addr,
         punch_out_at, punch_out_lat, punch_out_lng, punch_out_addr, status, note
       )`
    )
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .eq("attendance.date", today);

  return (data ?? []).map((p) => {
    const rec = Array.isArray(p.attendance) ? p.attendance[0] : undefined;
    return {
      id: rec?.id ?? "",
      user_id: p.id,
      date: today,
      punch_in_at: rec?.punch_in_at ?? null,
      punch_in_lat: rec?.punch_in_lat ?? null,
      punch_in_lng: rec?.punch_in_lng ?? null,
      punch_in_addr: rec?.punch_in_addr ?? null,
      punch_out_at: rec?.punch_out_at ?? null,
      punch_out_lat: rec?.punch_out_lat ?? null,
      punch_out_lng: rec?.punch_out_lng ?? null,
      punch_out_addr: rec?.punch_out_addr ?? null,
      status: rec?.status ?? "absent",
      note: rec?.note ?? null,
      profile: { full_name: p.full_name, department: p.department, designation: p.designation },
    };
  }) as TeamAttendanceRow[];
}

export type PunchParams = {
  tenantId: string;
  userId: string;
  gpsRequired?: boolean;
  lat?: number | null;
  lng?: number | null;
  addr?: string | null;
};

export async function punchIn(
  supabase: SupabaseClient,
  params: PunchParams
): Promise<{ error?: string }> {
  if (params.gpsRequired && (params.lat == null || params.lng == null)) {
    return { error: "GPS location is required for this tenant" };
  }

  const today = todayIST();
  const now = new Date().toISOString();

  // Attempt to insert a new row. On conflict (tenant_id, user_id, date), update
  // only when punch_in_at is still null — preserving an existing punch-in.
  const { data: upserted, error } = await supabase
    .from("attendance")
    .upsert(
      {
        tenant_id: params.tenantId,
        user_id: params.userId,
        date: today,
        punch_in_at: now,
        punch_in_lat: params.lat ?? null,
        punch_in_lng: params.lng ?? null,
        punch_in_addr: params.addr ?? null,
        status: "present",
      },
      { onConflict: "tenant_id,user_id,date", ignoreDuplicates: true }
    )
    .select("punch_in_at")
    .maybeSingle();

  if (error) return { error: error.message };

  // ignoreDuplicates:true returns null when the row already existed unchanged.
  if (!upserted) return { error: "Already punched in today" };

  return {};
}

export async function punchOut(
  supabase: SupabaseClient,
  params: PunchParams
): Promise<{ error?: string }> {
  if (params.gpsRequired && (params.lat == null || params.lng == null)) {
    return { error: "GPS location is required for this tenant" };
  }

  const today = todayIST();
  const now = new Date().toISOString();

  // Single UPDATE: only matches rows that are punched-in but not yet punched-out.
  const { data: updated, error } = await supabase
    .from("attendance")
    .update({
      punch_out_at: now,
      punch_out_lat: params.lat ?? null,
      punch_out_lng: params.lng ?? null,
      punch_out_addr: params.addr ?? null,
    })
    .eq("tenant_id", params.tenantId)
    .eq("user_id", params.userId)
    .eq("date", today)
    .not("punch_in_at", "is", null)
    .is("punch_out_at", null)
    .select("id")
    .maybeSingle();

  if (error) return { error: error.message };

  if (!updated) {
    // Determine which guard failed — extra read only on the error path.
    const { data: row } = await supabase
      .from("attendance")
      .select("punch_in_at, punch_out_at")
      .eq("tenant_id", params.tenantId)
      .eq("user_id", params.userId)
      .eq("date", today)
      .maybeSingle();
    if (!row?.punch_in_at) return { error: "Cannot punch out without punching in first" };
    return { error: "Already punched out today" };
  }

  return {};
}

export async function setAttendanceStatus(
  supabase: SupabaseClient,
  {
    tenantId,
    userId,
    date,
    status,
    note,
  }: { tenantId: string; userId: string; date: string; status: string; note?: string }
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("attendance")
    .upsert(
      { tenant_id: tenantId, user_id: userId, date, status, note: note ?? null },
      { onConflict: "tenant_id,user_id,date", ignoreDuplicates: false }
    );
  return { error: error?.message };
}

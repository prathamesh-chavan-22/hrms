import type { SupabaseClient } from "~/lib/supabase.server";

// Asia/Kolkata offset is UTC+5:30 = 19800 seconds
export function todayIST(): string {
  const now = new Date();
  // Shift by IST offset then extract YYYY-MM-DD from UTC representation
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
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
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, department, designation")
    .eq("tenant_id", tenantId)
    .eq("status", "active");

  if (!profiles || profiles.length === 0) return [];

  const { data: records } = await supabase
    .from("attendance")
    .select(
      "id, user_id, date, punch_in_at, punch_in_lat, punch_in_lng, punch_in_addr, punch_out_at, punch_out_lat, punch_out_lng, punch_out_addr, status, note"
    )
    .eq("tenant_id", tenantId)
    .eq("date", today);

  const recordMap = new Map((records ?? []).map((r) => [r.user_id, r]));

  return profiles.map((p) => {
    const rec = recordMap.get(p.id);
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
  lat?: number | null;
  lng?: number | null;
  addr?: string | null;
};

export async function punchIn(
  supabase: SupabaseClient,
  params: PunchParams
): Promise<{ error?: string }> {
  const today = todayIST();
  const now = new Date().toISOString();

  // Check existing row
  const { data: existing } = await supabase
    .from("attendance")
    .select("id, punch_in_at")
    .eq("tenant_id", params.tenantId)
    .eq("user_id", params.userId)
    .eq("date", today)
    .maybeSingle();

  if (existing?.punch_in_at) {
    return { error: "Already punched in today" };
  }

  const payload = {
    tenant_id: params.tenantId,
    user_id: params.userId,
    date: today,
    punch_in_at: now,
    punch_in_lat: params.lat ?? null,
    punch_in_lng: params.lng ?? null,
    punch_in_addr: params.addr ?? null,
    status: "present",
  };

  if (existing) {
    const { error } = await supabase
      .from("attendance")
      .update(payload)
      .eq("id", existing.id);
    return { error: error?.message };
  }

  const { error } = await supabase.from("attendance").insert(payload);
  return { error: error?.message };
}

export async function punchOut(
  supabase: SupabaseClient,
  params: PunchParams
): Promise<{ error?: string }> {
  const today = todayIST();
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("attendance")
    .select("id, punch_in_at, punch_out_at")
    .eq("tenant_id", params.tenantId)
    .eq("user_id", params.userId)
    .eq("date", today)
    .maybeSingle();

  if (!existing?.punch_in_at) {
    return { error: "Cannot punch out without punching in first" };
  }
  if (existing?.punch_out_at) {
    return { error: "Already punched out today" };
  }

  const { error } = await supabase
    .from("attendance")
    .update({
      punch_out_at: now,
      punch_out_lat: params.lat ?? null,
      punch_out_lng: params.lng ?? null,
      punch_out_addr: params.addr ?? null,
    })
    .eq("id", existing.id);

  return { error: error?.message };
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
  const { data: existing } = await supabase
    .from("attendance")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("attendance")
      .update({ status, note: note ?? null })
      .eq("id", existing.id);
    return { error: error?.message };
  }

  const { error } = await supabase.from("attendance").insert({
    tenant_id: tenantId,
    user_id: userId,
    date,
    status,
    note: note ?? null,
  });
  return { error: error?.message };
}

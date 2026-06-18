import type { DayMarker } from "~/components/AttendanceCalendar";
import { STATUS_COLORS } from "~/lib/attendance-status";

export type AttendanceRow = {
  id?: string;
  date: string;
  status: string;
  punch_in_at?: string | null;
  punch_out_at?: string | null;
  punch_in_addr?: string | null;
  punch_out_addr?: string | null;
  note?: string | null;
};

export type HolidayRow = {
  date: string;
  name: string;
};

/** Build calendar markers from attendance rows and optional holidays. */
export function buildAttendanceMarkers(
  attendance: AttendanceRow[],
  holidays: HolidayRow[] = [],
  monthPrefix?: string
): DayMarker[] {
  const attendanceMarkers: DayMarker[] = attendance.map((r) => ({
    date: r.date,
    kind: r.status as DayMarker["kind"],
    punch_in_at: r.punch_in_at,
    punch_out_at: r.punch_out_at,
    punch_in_addr: r.punch_in_addr,
    punch_out_addr: r.punch_out_addr,
  }));

  const holidayMarkers: DayMarker[] = holidays
    .filter((h) => !monthPrefix || h.date.startsWith(monthPrefix))
    .map((h) => ({
      date: h.date,
      kind: "holiday" as const,
      label: h.name,
    }));

  return [...attendanceMarkers, ...holidayMarkers];
}

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status as keyof typeof STATUS_COLORS] ?? "var(--muted)";
}

export function formatStatusLabel(status: string): string {
  return status.replace("_", " ").toUpperCase();
}

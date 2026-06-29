import type { DayMarker } from "~/components/AttendanceCalendar";

/** DB-backed attendance statuses (excludes UI-only holiday marker). */
export const ATTENDANCE_STATUSES = ["present", "half_day", "absent", "wfh"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export function isAttendanceStatus(value: string): value is AttendanceStatus {
  return (ATTENDANCE_STATUSES as readonly string[]).includes(value);
}

/** Single source of truth for attendance status colors and labels. */
export const STATUS_COLORS: Record<DayMarker["kind"], string> = {
  present: "var(--ok)",
  half_day: "var(--warn)",
  absent: "var(--err)",
  wfh: "var(--accent)",
  holiday: "var(--accent-dark)",
};

export const STATUS_LABELS: Record<DayMarker["kind"], string> = {
  present: "PRESENT",
  half_day: "HALF DAY",
  absent: "ABSENT",
  wfh: "WFH",
  holiday: "HOLIDAY",
};

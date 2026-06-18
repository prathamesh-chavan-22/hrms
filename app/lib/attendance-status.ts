import type { DayMarker } from "~/components/AttendanceCalendar";

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

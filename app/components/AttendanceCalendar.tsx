import { useEffect, useState } from "react";
import { todayIST } from "~/lib/dates";

export type DayMarker = {
  date: string; // YYYY-MM-DD
  kind: "present" | "half_day" | "absent" | "wfh" | "holiday";
  label?: string;
  punch_in_at?: string | null;
  punch_out_at?: string | null;
  punch_in_addr?: string | null;
  punch_out_addr?: string | null;
};

interface AttendanceCalendarProps {
  markers: DayMarker[];
  initialYear?: number;
  initialMonth?: number; // 1-12
  onDayClick?: (date: string, marker?: DayMarker) => void;
  onMonthChange?: (year: number, month: number) => void;
  selectedDate?: string | null;
}

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

const STATUS_COLORS: Record<DayMarker["kind"], string> = {
  present: "var(--ok)",
  half_day: "var(--warn)",
  absent: "var(--err)",
  wfh: "var(--accent)",
  holiday: "var(--accent-dark)",
};

const STATUS_LABELS: Record<DayMarker["kind"], string> = {
  present: "PRESENT",
  half_day: "HALF DAY",
  absent: "ABSENT",
  wfh: "WFH",
  holiday: "HOLIDAY",
};

export function AttendanceCalendar({
  markers,
  initialYear,
  initialMonth,
  onDayClick,
  onMonthChange,
  selectedDate,
}: AttendanceCalendarProps) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(initialYear ?? now.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialMonth ?? now.getMonth() + 1);

  // Sync local state when loader provides new year/month after navigation
  useEffect(() => {
    if (initialYear != null) setViewYear(initialYear);
    if (initialMonth != null) setViewMonth(initialMonth);
  }, [initialYear, initialMonth]);

  const todayStr = todayIST();

  // Build marker lookup
  const markerMap = new Map<string, DayMarker>();
  for (const m of markers) {
    markerMap.set(m.date, m);
  }

  // Compute days in month + leading empty slots (week starts Monday)
  const firstDay = new Date(viewYear, viewMonth - 1, 1);
  // getDay(): 0=Sun,1=Mon...6=Sat → convert to Mon=0..Sun=6
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full grid rows
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() {
    const newMonth = viewMonth === 1 ? 12 : viewMonth - 1;
    const newYear = viewMonth === 1 ? viewYear - 1 : viewYear;
    setViewYear(newYear);
    setViewMonth(newMonth);
    onMonthChange?.(newYear, newMonth);
  }
  function nextMonth() {
    const newMonth = viewMonth === 12 ? 1 : viewMonth + 1;
    const newYear = viewMonth === 12 ? viewYear + 1 : viewYear;
    setViewYear(newYear);
    setViewMonth(newMonth);
    onMonthChange?.(newYear, newMonth);
  }

  function pad(n: number) { return String(n).padStart(2, "0"); }
  function dateStr(day: number) { return `${viewYear}-${pad(viewMonth)}-${pad(day)}`; }

  return (
    <div className="bevel">
      {/* Header */}
      <div className="panel-header px-4 py-3 flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="bevel-press border-2 border-rule w-8 h-8 flex items-center justify-center font-mono font-bold text-sm text-ink hover:bg-surface-2 transition-colors"
          aria-label="Previous month"
        >
          ‹
        </button>
        <div className="text-center">
          <p className="display text-base text-ink font-bold tracking-wider">
            {MONTHS[viewMonth - 1]} {viewYear}
          </p>
        </div>
        <button
          onClick={nextMonth}
          className="bevel-press border-2 border-rule w-8 h-8 flex items-center justify-center font-mono font-bold text-sm text-ink hover:bg-surface-2 transition-colors"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      {/* Weekday row */}
      <div className="grid grid-cols-7 border-b-2 border-rule">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2 text-center eyebrow border-r-2 border-rule last:border-r-0">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (day === null) {
            return (
              <div
                key={`empty-${idx}`}
                className="cal-cell border-b-2 border-r-2 border-rule last:border-r-0 bg-surface-2 opacity-30"
                style={{ minHeight: 64 }}
              />
            );
          }

          const ds = dateStr(day);
          const marker = markerMap.get(ds);
          const isToday = ds === todayStr;
          const isSelected = ds === selectedDate;
          const isWeekend = (() => {
            const dow = (new Date(viewYear, viewMonth - 1, day).getDay() + 6) % 7;
            return dow >= 5; // Sat=5, Sun=6
          })();

          const colBorder = (idx % 7 === 6) ? "" : "border-r-2 border-rule";

          return (
            <div
              key={ds}
              onClick={() => onDayClick?.(ds, marker)}
              className={`
                cal-cell relative border-b-2 border-rule ${colBorder}
                ${isSelected ? "bevel-accent" : isToday ? "bevel" : ""}
                ${onDayClick ? "cursor-pointer hover:bg-surface-2" : ""}
                ${isWeekend && !marker ? "opacity-60" : ""}
              `}
              style={{ minHeight: 64 }}
            >
              <div className="p-1.5">
                <span
                  className={`tnum text-xs font-mono font-bold inline-block
                    ${isSelected ? "text-bg" : isToday ? "text-accent font-black" : "text-ink-2"}
                  `}
                >
                  {day}
                </span>
              </div>
              {marker && (
                <div className="absolute bottom-1.5 left-1.5 right-1.5">
                  <div
                    className="h-1.5 w-full"
                    style={{ backgroundColor: STATUS_COLORS[marker.kind] }}
                    title={marker.label ?? STATUS_LABELS[marker.kind]}
                  />
                </div>
              )}
              {isToday && !marker && (
                <div className="absolute bottom-1.5 left-1.5 right-1.5">
                  <div className="h-1.5 w-full" style={{ backgroundColor: "var(--muted)", opacity: 0.4 }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="panel-header px-4 py-2.5 flex flex-wrap gap-2 border-t-2 border-rule">
        {(Object.entries(STATUS_LABELS) as [DayMarker["kind"], string][]).map(([kind, label]) => (
          <span key={kind} className="inline-flex items-center gap-1.5 eyebrow">
            <span
              className="inline-block w-3 h-2"
              style={{ backgroundColor: STATUS_COLORS[kind] }}
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

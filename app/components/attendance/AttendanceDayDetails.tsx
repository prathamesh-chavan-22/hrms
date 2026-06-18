import { fmtTime, durHours } from "~/lib/format";
import { getStatusColor, formatStatusLabel } from "~/lib/attendance-markers";
import type { AttendanceRow } from "~/lib/attendance-markers";
import { IcyCard, IcyCardBody, IcyCardHeader } from "~/components/IcyCard";

export interface AttendanceDayDetailsProps {
  selectedDate: string | null;
  record: AttendanceRow | undefined;
}

export function AttendanceDayDetails({ selectedDate, record }: AttendanceDayDetailsProps) {
  return (
    <IcyCard className="h-full">
      <IcyCardHeader>
        <h2 className="eyebrow">
          {selectedDate
            ? new Date(selectedDate + "T00:00:00")
                .toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })
                .toUpperCase()
            : "SELECT A DAY"}
        </h2>
      </IcyCardHeader>
      <IcyCardBody>
        {!selectedDate ? (
          <p className="text-ink-2 text-sm">Click a day to view details.</p>
        ) : !record ? (
          <p className="text-ink-2 text-sm">No record.</p>
        ) : (
          <div className="space-y-3">
            <span
              className="chip"
              style={{ backgroundColor: getStatusColor(record.status), color: "#fff" }}
            >
              {formatStatusLabel(record.status)}
            </span>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="eyebrow">PUNCH IN</dt>
                <dd className="tnum font-mono text-ink mt-0.5">{fmtTime(record.punch_in_at ?? null)}</dd>
                {record.punch_in_addr && (
                  <dd className="text-xs text-ink-2 font-mono mt-0.5 break-words">
                    {record.punch_in_addr}
                  </dd>
                )}
              </div>
              <div>
                <dt className="eyebrow">PUNCH OUT</dt>
                <dd className="tnum font-mono text-ink mt-0.5">{fmtTime(record.punch_out_at ?? null)}</dd>
                {record.punch_out_addr && (
                  <dd className="text-xs text-ink-2 font-mono mt-0.5 break-words">
                    {record.punch_out_addr}
                  </dd>
                )}
              </div>
              {record.punch_in_at && record.punch_out_at && (
                <div>
                  <dt className="eyebrow">DURATION</dt>
                  <dd className="tnum font-mono text-ink mt-0.5">
                    {durHours(record.punch_in_at, record.punch_out_at)}
                  </dd>
                </div>
              )}
              {record.note && (
                <div>
                  <dt className="eyebrow">NOTE</dt>
                  <dd className="text-ink-2 text-xs mt-0.5">{record.note}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </IcyCardBody>
    </IcyCard>
  );
}

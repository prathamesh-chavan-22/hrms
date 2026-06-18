import { fmtTime, durHours } from "~/lib/format";
import { IcyCard, IcyCardBody, IcyCardHeader } from "~/components/IcyCard";

export interface TeamAttendanceRow {
  user_id: string;
  punch_in_at: string | null;
  punch_out_at: string | null;
  punch_in_lat: number | null;
  punch_in_lng: number | null;
  punch_in_addr: string | null;
  profile: {
    full_name: string;
    department: string | null;
    designation: string | null;
  };
}

export function TeamAttendanceTable({
  teamToday,
  today,
}: {
  teamToday: TeamAttendanceRow[];
  today: string;
}) {
  if (teamToday.length === 0) return null;

  return (
    <IcyCard>
      <IcyCardHeader>
        <h2 className="eyebrow">TEAM TODAY — {today}</h2>
      </IcyCardHeader>
      <IcyCardBody className="p-0">
        <ul>
          {teamToday.map((row) => (
            <li
              key={row.user_id}
              className="px-5 py-3 flex flex-wrap items-center gap-3 rule-dashed first:border-t-0"
            >
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
                    ? row.punch_out_at
                      ? "var(--ok)"
                      : "var(--warn)"
                    : "var(--muted)",
                  color: "#fff",
                }}
              >
                {row.punch_in_at ? (row.punch_out_at ? "COMPLETE" : "IN") : "NOT IN"}
              </span>
              <div className="shrink-0 text-right">
                <p className="tnum font-mono text-xs text-ink-2">
                  {fmtTime(row.punch_in_at)} → {fmtTime(row.punch_out_at)}
                </p>
                {row.punch_in_at && row.punch_out_at && (
                  <p className="tnum font-mono text-xs text-muted">
                    {durHours(row.punch_in_at, row.punch_out_at)}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </IcyCardBody>
    </IcyCard>
  );
}

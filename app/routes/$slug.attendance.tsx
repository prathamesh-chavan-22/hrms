import { IcyCard, IcyCardBody } from "~/components/IcyCard";

export function meta() {
  return [{ title: "Attendance — Glacia HRMS" }];
}

export default function AttendancePage() {
  return (
    <div className="p-5 lg:p-7 space-y-6">
      <div>
        <p className="eyebrow mb-2">ATTENDANCE</p>
        <h1 className="display text-3xl text-ink">Punch in/out with GPS</h1>
      </div>
      <IcyCard className="hard-shadow">
        <IcyCardBody className="py-16 max-w-md">
          <span className="chip chip-accent mb-4">PHASE 02</span>
          <h2 className="display text-2xl text-ink mb-2">Under development</h2>
          <p className="text-ink-2 text-sm">
            GPS-based attendance — punch in/out with location capture, view your attendance history, and let HR track all locations on an OpenStreetMap.
          </p>
        </IcyCardBody>
      </IcyCard>
    </div>
  );
}

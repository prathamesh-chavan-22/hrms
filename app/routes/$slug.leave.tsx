import { IcyCard, IcyCardBody } from "~/components/IcyCard";

export function meta() {
  return [{ title: "Leave — Glacia HRMS" }];
}

export default function LeavePage() {
  return (
    <div className="p-5 lg:p-7 space-y-6">
      <div>
        <p className="eyebrow mb-2">LEAVE</p>
        <h1 className="display text-3xl text-ink">Apply & track balance</h1>
      </div>
      <IcyCard className="hard-shadow">
        <IcyCardBody className="py-16 max-w-md">
          <span className="chip chip-accent mb-4">PHASE 02</span>
          <h2 className="display text-2xl text-ink mb-2">Under development</h2>
          <p className="text-ink-2 text-sm">
            Full leave management — apply, approve, track balances, carry-forward rules and encashment — is coming soon.
          </p>
        </IcyCardBody>
      </IcyCard>
    </div>
  );
}

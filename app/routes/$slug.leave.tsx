import { useOutletContext } from "react-router";
import { IcyCard, IcyCardBody } from "~/components/IcyCard";
import type { Profile, Tenant } from "~/types/app";

export function meta() {
  return [{ title: "Leave — Glacia HRMS" }];
}

export default function LeavePage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Leave Management</h1>
        <p className="text-slate-500 mt-1 text-sm">Apply for leave and track your balance</p>
      </div>
      <IcyCard>
        <IcyCardBody className="py-20 text-center">
          <div className="text-5xl mb-4">🗓️</div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Coming in Phase 2</h2>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">
            Full leave management — apply, approve, track balances, carry-forward rules and encashment — is coming soon.
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 bg-sky-100 text-sky-600 px-3 py-1.5 rounded-full text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            Under development
          </span>
        </IcyCardBody>
      </IcyCard>
    </div>
  );
}

import { useLoaderData, data } from "react-router";
import type { Route } from "./+types/$slug.dashboard";
import { requireTenantAccess } from "~/lib/auth.server";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { getPlan } from "~/lib/plans";
import { IcyCard, IcyCardBody, IcyCardHeader } from "~/components/IcyCard";
import { Badge, statusBadge } from "~/components/Badge";
import type { Profile, Tenant } from "~/types/app";

export function meta() {
  return [{ title: "Dashboard — Glacia HRMS" }];
}

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const slug = params.slug!;
  const env = context.cloudflare.env;
  const { profile, tenant } = await requireTenantAccess(request, env, slug);
  const { supabase } = createSupabaseServerClient(request, env);

  const [employeesRes, holidaysRes, countRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role, status, department, designation, created_at")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("holidays")
      .select("id, name, date, type")
      .eq("tenant_id", tenant.id)
      .gte("date", new Date().toISOString().slice(0, 10))
      .order("date")
      .limit(5),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id),
  ]);

  return data({
    profile,
    tenant,
    recentEmployees: employeesRes.data ?? [],
    upcomingHolidays: holidaysRes.data ?? [],
    totalEmployees: countRes.count ?? 0,
  });
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  tag: string;
}

function StatCard({ label, value, sub, tag }: StatCardProps) {
  return (
    <div className="bevel p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="eyebrow">{label}</p>
        <span className="chip chip-accent">{tag}</span>
      </div>
      <p className="display text-3xl text-ink tnum">{value}</p>
      {sub && <p className="eyebrow mt-1.5">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { profile, tenant, recentEmployees, upcomingHolidays, totalEmployees } =
    useLoaderData<typeof loader>();

  const plan = getPlan(tenant.plan);
  const isHR = ["owner", "hr", "admin"].includes(profile.role);

  return (
    <div className="p-5 lg:p-7 space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="eyebrow mb-2">DASHBOARD</p>
          <h1 className="display text-3xl text-ink">
            Good day, {profile.full_name.split(" ")[0]}.
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="chip">{tenant.name.toUpperCase()}</span>
          <span className="chip chip-accent">{plan.name.toUpperCase()}</span>
          <span className="chip tnum">{totalEmployees}/{plan.maxEmployees} STAFF</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="TOTAL EMPLOYEES" value={totalEmployees} sub={`OF ${plan.maxEmployees} IN ${plan.name.toUpperCase()}`} tag="HEAD" />
        <StatCard label="UPCOMING HOLIDAYS" value={String(upcomingHolidays.length).padStart(2, "0")} sub="NEXT DAYS" tag="CAL" />
        <StatCard label="YOUR PLAN" value={plan.name} sub={plan.price === 0 ? "FREE TIER" : `₹${plan.price}/MO`} tag="TIER" />
        <StatCard label="GPS ATTENDANCE" value={tenant.gps_required ? "ON" : "OFF"} sub="LOCATION PUNCH" tag="GEO" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Employees (HR only) */}
        {isHR && (
          <IcyCard>
            <IcyCardHeader>
              <h2 className="eyebrow">RECENT TEAM MEMBERS</h2>
            </IcyCardHeader>
            <IcyCardBody className="p-0">
              {recentEmployees.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-ink-2 text-sm">No employees yet. Invite your team.</p>
                </div>
              ) : (
                <ul>
                  {recentEmployees.map((emp) => (
                    <li key={emp.id} className="px-5 py-3 flex items-center justify-between rule-dashed first:border-t-0">
                      <div className="flex items-center gap-3">
                        <div className="bevel-accent w-8 h-8 flex items-center justify-center text-xs font-mono font-bold !shadow-none">
                          {emp.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-ink">{emp.full_name}</p>
                          <p className="eyebrow mt-0.5">{((emp as Profile).designation ?? (emp as Profile).department ?? "—").toUpperCase()}</p>
                        </div>
                      </div>
                      <Badge {...statusBadge((emp as Profile).status)} size="sm">{(emp as Profile).status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </IcyCardBody>
          </IcyCard>
        )}

        {/* Upcoming Holidays */}
        <IcyCard>
          <IcyCardHeader>
            <h2 className="eyebrow">UPCOMING HOLIDAYS</h2>
          </IcyCardHeader>
          <IcyCardBody className="p-0">
            {upcomingHolidays.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-ink-2 text-sm">No upcoming holidays.</p>
              </div>
            ) : (
              <ul>
                {upcomingHolidays.map((h) => {
                  const d = new Date(h.date);
                  return (
                    <li key={h.id} className="px-5 py-3 flex items-center gap-4 rule-dashed first:border-t-0">
                      <div className="bevel-sunken w-12 text-center py-1">
                        <p className="eyebrow">{d.toLocaleDateString("en-IN", { month: "short" }).toUpperCase()}</p>
                        <p className="text-lg font-bold text-ink leading-tight tnum">{d.getDate()}</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-ink">{h.name}</p>
                        <p className="eyebrow mt-0.5">{h.type}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </IcyCardBody>
        </IcyCard>
      </div>
    </div>
  );
}

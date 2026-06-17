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
  icon: string;
  color: string;
}

function StatCard({ label, value, sub, icon, color }: StatCardProps) {
  return (
    <IcyCard>
      <IcyCardBody className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          {sub && <p className="text-xs text-slate-400">{sub}</p>}
        </div>
      </IcyCardBody>
    </IcyCard>
  );
}

export default function DashboardPage() {
  const { profile, tenant, recentEmployees, upcomingHolidays, totalEmployees } =
    useLoaderData<typeof loader>();

  const plan = getPlan(tenant.plan);
  const isHR = ["owner", "hr", "admin"].includes(profile.role);

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Good day, {profile.full_name.split(" ")[0]} 👋
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          {tenant.name} &middot; {plan.name} Plan &middot; {totalEmployees}/{plan.maxEmployees} employees
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Employees" value={totalEmployees} sub={`of ${plan.maxEmployees} in ${plan.name}`} icon="👥" color="bg-sky-100" />
        <StatCard label="Upcoming Holidays" value={upcomingHolidays.length} sub="in the next days" icon="🗓️" color="bg-cyan-100" />
        <StatCard label="Your Plan" value={plan.name} sub={plan.price === 0 ? "Free tier" : `₹${plan.price}/mo`} icon="⭐" color="bg-violet-100" />
        <StatCard label="GPS Attendance" value={tenant.gps_required ? "Enabled" : "Disabled"} sub="Location-based punch" icon="📍" color="bg-emerald-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Employees (HR only) */}
        {isHR && (
          <IcyCard>
            <IcyCardHeader>
              <h2 className="text-base font-semibold text-slate-800">Recent Team Members</h2>
            </IcyCardHeader>
            <IcyCardBody className="p-0">
              {recentEmployees.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-4xl mb-3">👤</p>
                  <p className="text-slate-500 text-sm">No employees yet. Invite your team!</p>
                </div>
              ) : (
                <ul className="divide-y divide-sky-50">
                  {recentEmployees.map((emp) => (
                    <li key={emp.id} className="px-6 py-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 text-sm font-bold">
                          {emp.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{emp.full_name}</p>
                          <p className="text-xs text-slate-400">{(emp as Profile).designation ?? (emp as Profile).department ?? "—"}</p>
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
            <h2 className="text-base font-semibold text-slate-800">Upcoming Holidays</h2>
          </IcyCardHeader>
          <IcyCardBody className="p-0">
            {upcomingHolidays.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-4xl mb-3">🏖️</p>
                <p className="text-slate-500 text-sm">No upcoming holidays</p>
              </div>
            ) : (
              <ul className="divide-y divide-sky-50">
                {upcomingHolidays.map((h) => {
                  const d = new Date(h.date);
                  return (
                    <li key={h.id} className="px-6 py-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 text-center">
                          <p className="text-xs text-sky-500 font-medium uppercase">
                            {d.toLocaleDateString("en-IN", { month: "short" })}
                          </p>
                          <p className="text-lg font-bold text-slate-800 leading-tight">
                            {d.getDate()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{h.name}</p>
                          <p className="text-xs text-slate-400 capitalize">{h.type}</p>
                        </div>
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

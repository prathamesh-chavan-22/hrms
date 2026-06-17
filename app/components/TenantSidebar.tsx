import { NavLink, Form } from "react-router";
import type { Tenant, Profile } from "~/types/app";
import { GlaciaLogo } from "./GlaciaLogo";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  hrOnly?: boolean;
  phase2?: boolean;
}

function NavIcon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0">
      <path d={path} />
    </svg>
  );
}

const ICONS = {
  dashboard: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  employees: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0",
  leave: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  holidays: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  attendance: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  chat: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z",
  settings: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
};

interface TenantSidebarProps {
  tenant: Tenant;
  profile: Profile;
  slug: string;
}

export function TenantSidebar({ tenant, profile, slug }: TenantSidebarProps) {
  const isHR = ["owner", "hr", "admin"].includes(profile.role);

  const navItems: NavItem[] = [
    { to: `/${slug}/dashboard`, label: "Dashboard", icon: <NavIcon path={ICONS.dashboard} /> },
    { to: `/${slug}/attendance`, label: "Attendance", icon: <NavIcon path={ICONS.attendance} />, phase2: true },
    { to: `/${slug}/leave`, label: "Leave", icon: <NavIcon path={ICONS.leave} />, phase2: true },
    { to: `/${slug}/holidays`, label: "Holidays", icon: <NavIcon path={ICONS.holidays} />, phase2: true },
    { to: `/${slug}/chat`, label: "Assistant", icon: <NavIcon path={ICONS.chat} />, phase2: true },
    ...(isHR ? [
      { to: `/${slug}/employees`, label: "Employees", icon: <NavIcon path={ICONS.employees} />, hrOnly: true },
      { to: `/${slug}/settings`, label: "Settings", icon: <NavIcon path={ICONS.settings} />, hrOnly: true },
    ] : []),
  ];

  const accentColor = tenant.theme?.accent ?? "#38bdf8";

  return (
    <aside className="w-64 min-h-screen bg-white/70 backdrop-blur-lg border-r border-sky-100 flex flex-col">
      {/* Logo + company */}
      <div className="px-5 py-5 border-b border-sky-50">
        {tenant.logo_url ? (
          <div className="flex items-center gap-3">
            <img
              src={tenant.logo_url}
              alt={tenant.name}
              className="w-9 h-9 rounded-xl object-contain border border-sky-100 bg-white p-0.5"
            />
            <div>
              <p className="text-sm font-bold text-slate-800 truncate max-w-[140px]">{tenant.name}</p>
              <p className="text-xs text-slate-400">/{slug}</p>
            </div>
          </div>
        ) : (
          <div>
            <GlaciaLogo size="sm" />
            <p className="mt-1 text-xs font-semibold text-slate-700 truncate">{tenant.name}</p>
            <p className="text-xs text-slate-400">/{slug}</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group
              ${isActive
                ? "bg-sky-100 text-sky-700 shadow-sm"
                : "text-slate-600 hover:bg-sky-50 hover:text-sky-700"
              }
              ${item.phase2 ? "opacity-60" : ""}`
            }
          >
            {item.icon}
            <span>{item.label}</span>
            {item.phase2 && (
              <span className="ml-auto text-xs bg-sky-100 text-sky-500 px-1.5 py-0.5 rounded-md font-normal">
                Soon
              </span>
            )}
            {item.hrOnly && !item.phase2 && (
              <span className="ml-auto text-xs bg-violet-100 text-violet-500 px-1.5 py-0.5 rounded-md font-normal">
                HR
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + logout */}
      <div className="px-4 py-4 border-t border-sky-50">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: accentColor }}
          >
            {profile.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">{profile.full_name}</p>
            <p className="text-xs text-slate-400 capitalize">{profile.role}</p>
          </div>
        </div>
        <Form action="/logout" method="post">
          <button
            type="submit"
            className="w-full text-left text-xs text-slate-500 hover:text-red-500 transition-colors px-1"
          >
            Sign out
          </button>
        </Form>
      </div>
    </aside>
  );
}

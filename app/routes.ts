import {
  type RouteConfig,
  index,
  route,
  layout,
  prefix,
} from "@react-router/dev/routes";

export default [
  // Marketing pages
  index("routes/home.tsx"),
  route("pricing", "routes/pricing.tsx"),

  // Auth
  route("signup", "routes/signup.tsx"),
  route("login", "routes/login.tsx"),
  route("logout", "routes/logout.tsx"),
  route("change-password", "routes/change-password.tsx"),
  route("forgot-password", "routes/forgot-password.tsx"),
  route("invite/:token", "routes/invite.$token.tsx"),
  route("admin/company-requests", "routes/admin.company-requests.tsx"),

  // Tenant-scoped (guarded by layout)
  layout("routes/$slug.tsx", [
    ...prefix(":slug", [
      route("dashboard", "routes/$slug.dashboard.tsx"),
      route("employees", "routes/$slug.employees.tsx"),
      route("settings", "routes/$slug.settings.tsx"),
      // Phase 2 stubs
      route("leave", "routes/$slug.leave.tsx"),
      route("holidays", "routes/$slug.holidays.tsx"),
      route("attendance", "routes/$slug.attendance.tsx"),
      route("chat", "routes/$slug.chat.tsx"),
    ]),
  ]),
] satisfies RouteConfig;

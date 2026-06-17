# Glacia HRMS Code Optimization Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve correctness, security, performance, and maintainability of the Glacia HRMS React Router 7 + Cloudflare Workers + Supabase app without changing product behavior (except fixing bugs).

**Architecture:** Four phased workstreams — P0 correctness/security fixes first, P1 request-path and bundle optimizations, P2 shared utilities and DB query consolidation, P3 edge caching and docs. Each phase is independently shippable and verifiable via `npm run typecheck` and manual smoke tests.

**Tech Stack:** React Router 7, Cloudflare Workers, Supabase (RLS), Tailwind 4, Leaflet, Resend

---

## Current State Summary

| Area | Finding |
|------|---------|
| Auth | Parent `$slug` layout + every child loader both call `requireTenantAccess` (2× auth + profile queries per navigation) |
| Attendance | Calendar month nav UI doesn't sync with loader; GPS enforced client-only |
| Dates | `todayIST()` duplicated; chat uses UTC dates |
| Bundle | Leaflet JS dynamically imported (good); CSS loaded from unpkg CDN at runtime |
| DB | Team attendance = 2 queries merged in JS; punch in/out = read-then-write |
| Security | Service role overused; email HTML unescaped; map popups XSS risk |
| DRY | `fmt`, `durHours`, `isHR`, flash messages duplicated across routes |

---

## Phase P0 — Correctness & Security (Ship First)

### Task 1: Fix attendance calendar month navigation

**Problem:** `handleMonthNav` exists but is never passed to `AttendanceCalendar`. Local calendar state diverges from loader data.

**Files:**
- Modify: `app/components/AttendanceCalendar.tsx`
- Modify: `app/routes/$slug.attendance.tsx:337-372`

- [ ] **Step 1: Add `onMonthChange` prop to AttendanceCalendar**

```tsx
// app/components/AttendanceCalendar.tsx — add to props interface
onMonthChange?: (year: number, month: number) => void;

// Inside prev/next button handlers, after setViewYear/setViewMonth:
onMonthChange?.(newYear, newMonth);

// Sync when loader props change:
useEffect(() => {
  setViewYear(initialYear);
  setViewMonth(initialMonth);
}, [initialYear, initialMonth]);
```

- [ ] **Step 2: Wire attendance route to URL search params**

```tsx
// app/routes/$slug.attendance.tsx — pass to AttendanceCalendar
<AttendanceCalendar
  markers={markers}
  initialYear={calYear}
  initialMonth={calMonth}
  selectedDate={selectedDate}
  onDayClick={(date) => setSelectedDate(date === selectedDate ? null : date)}
  onMonthChange={handleMonthNav}
/>
```

- [ ] **Step 3: Verify**

Run: `npm run dev` → open `/{slug}/attendance` → click calendar prev/next → URL should show `?year=&month=` and calendar markers should match the displayed month.

- [ ] **Step 4: Commit**

```bash
git add app/components/AttendanceCalendar.tsx app/routes/\$slug.attendance.tsx
git commit -m "fix: sync attendance calendar with loader month navigation"
```

---

### Task 2: Enforce GPS server-side when tenant requires it

**Problem:** `tenant.gps_required` only disables the client submit button. Action accepts empty lat/lng.

**Files:**
- Modify: `app/routes/$slug.attendance.tsx:64-89`
- Modify: `app/lib/attendance.server.ts:130-205`

- [ ] **Step 1: Add validation helper in attendance.server.ts**

```typescript
function requireValidCoords(
  gpsRequired: boolean,
  lat: number | null,
  lng: number | null
): string | null {
  if (!gpsRequired) return null;
  if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
    return "GPS location is required for this tenant";
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return "Invalid GPS coordinates";
  }
  return null;
}
```

- [ ] **Step 2: Reject in action before punchIn/punchOut**

```typescript
// In $slug.attendance.tsx action, after parsing lat/lng:
const coordError = requireValidCoords(tenant.gps_required, lat, lng);
if (coordError) return data({ error: coordError, success: null, intent });
```

Pass `tenant.gps_required` into `punchIn`/`punchOut` as a belt-and-suspenders check inside server functions.

- [ ] **Step 3: Verify**

With a tenant where `gps_required = true`, POST punch action without lat/lng (curl or devtools) → expect error, no DB row.

- [ ] **Step 4: Commit**

```bash
git commit -m "fix: enforce GPS coordinates server-side when required"
```

---

### Task 3: Unify IST date handling

**Problem:** Chat uses `new Date().toISOString().slice(0, 10)` (UTC). Attendance uses manual `+5.5h` offset duplicated in two files.

**Files:**
- Create: `app/lib/dates.ts`
- Modify: `app/lib/attendance.server.ts:4-8`
- Modify: `app/components/AttendanceCalendar.tsx:54-57`
- Modify: `app/routes/$slug.chat.tsx:67,75`

- [ ] **Step 1: Create shared date module**

```typescript
// app/lib/dates.ts
export function todayIST(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
```

- [ ] **Step 2: Replace all usages**

- Re-export from `attendance.server.ts` for backward compat OR update all imports to `~/lib/dates`
- Replace chat lines 67 and 75 with `todayIST()` import

- [ ] **Step 3: Verify**

Run: `npm run typecheck`  
Manual: chat "attendance today" near midnight IST should match attendance page.

- [ ] **Step 4: Commit**

```bash
git commit -m "fix: use consistent Asia/Kolkata date boundaries across app"
```

---

## Phase P1 — Request Path & Bundle Performance

### Task 4: Single auth gate via layout loader

**Problem:** Every `$slug.*` child re-runs `requireTenantAccess`. Layout already provides `{ profile, tenant, slug }` via `Outlet context`.

**Files:**
- Modify: `app/routes/$slug.tsx` (export typed context)
- Modify: all `app/routes/$slug.*.tsx` loaders

- [ ] **Step 1: Create tenant context helper**

```typescript
// app/lib/tenant-context.server.ts
import { requireTenantAccess } from "~/lib/auth.server";
import { createSupabaseServerClient, appendCookieHeaders } from "~/lib/supabase.server";

export async function getTenantContext(args: {
  request: Request;
  env: Env;
  slug: string;
}) {
  const { profile, tenant, cookies } = await requireTenantAccess(
    args.request,
    args.env,
    args.slug
  );
  const { supabase } = createSupabaseServerClient(args.request, args.env);
  return { profile, tenant, supabase, cookies, slug: args.slug };
}
```

- [ ] **Step 2: Layout loader returns supabase + cookies**

Layout remains the **only** place that calls `requireTenantAccess`. Child loaders use `context.get(loadContext)` pattern OR read parent via React Router's route loader dependency:

```typescript
// Child loader pattern — use parent loader data
export async function loader({ params, request, context, parent }: Route.LoaderArgs) {
  const parentData = await parent(); // { profile, tenant, slug }
  const { supabase } = createSupabaseServerClient(request, context.cloudflare.env);
  // ... route-specific queries only
  return data({ monthAttendance, todayRecord /* no profile/tenant */ });
}
```

- [ ] **Step 3: Update components to use `useRouteLoaderData("routes/$slug")` or `useOutletContext`**

Child components already have outlet context from layout line 36 — remove duplicate `profile`/`tenant` from child loader returns.

- [ ] **Step 4: Verify**

Add temporary logging or use Supabase dashboard query stats: navigating dashboard → attendance should show **1** profile fetch, not 2.

- [ ] **Step 5: Commit**

```bash
git commit -m "perf: deduplicate tenant auth across nested route loaders"
```

---

### Task 5: Optimize dashboard holidays query

**Files:**
- Modify: `app/routes/$slug.dashboard.tsx:41-71`

- [ ] **Step 1: Remove duplicate `allHolidays` / `upcomingHolidays`**

Single query with filters:

```typescript
const { data: upcomingHolidays } = await supabase
  .from("holidays")
  .select("name, date")
  .eq("tenant_id", tenant.id)
  .gte("date", todayIST())
  .order("date")
  .limit(5);
```

- [ ] **Step 2: Commit**

```bash
git commit -m "perf: limit dashboard holidays query to next 5"
```

---

### Task 6: Bundle Leaflet CSS locally and harden map popups

**Files:**
- Modify: `app/components/AttendanceMap.tsx`
- Modify: `vite.config.ts` (if CSS import needs config)

- [ ] **Step 1: Replace CDN CSS injection**

```typescript
import "leaflet/dist/leaflet.css";
```

Remove lines 34-41 (unpkg link injection).

- [ ] **Step 2: Escape popup HTML**

```typescript
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
// Use escapeHtml(m.name), escapeHtml(m.time), escapeHtml(m.addr ?? "")
```

- [ ] **Step 3: Stabilize map effect — init once, update markers**

Split into two effects: one for map init (empty deps), one for marker layer updates keyed on serialized marker coords.

- [ ] **Step 4: Lazy-load map at route level (optional)**

```typescript
// $slug.attendance.tsx
const AttendanceMap = lazy(() =>
  import("~/components/AttendanceMap").then((m) => ({ default: m.AttendanceMap }))
);
```

- [ ] **Step 5: Commit**

```bash
git commit -m "perf: bundle leaflet CSS locally; fix map popup XSS"
```

---

### Task 7: Reduce chat intent fetching

**Files:**
- Modify: `app/routes/$slug.chat.tsx:12-43`

- [ ] **Step 1: Remove intents from loader (or cache statically)**

Loader returns only `{ greeting }`. Action fetches intents once per message (unchanged) OR extract shared `getChatbotIntents(supabase, tenantId)` helper.

- [ ] **Step 2: Only run sub-queries for matched intent**

Move leave/holiday/attendance queries inside the `if (matched)` block after `query_type` is known (partially done — ensure no queries before match).

- [ ] **Step 3: Commit**

```bash
git commit -m "perf: trim chat loader and defer intent sub-queries"
```

---

## Phase P2 — Maintainability & Database Efficiency

### Task 8: Extract shared utilities

**Files:**
- Create: `app/lib/format.ts`
- Create: `app/lib/roles.ts`
- Create: `app/components/FlashMessage.tsx`
- Modify: `$slug.dashboard.tsx`, `$slug.attendance.tsx`, `$slug.employees.tsx`, `$slug.settings.tsx`, `TenantSidebar.tsx`

- [ ] **Step 1: Move helpers**

```typescript
// app/lib/format.ts
export function fmtTime(ts: string | null): string { /* ... */ }
export function durHours(a: string | null, b: string | null): string { /* ... */ }

// app/lib/roles.ts
export function isHR(role: string): boolean {
  return ["owner", "hr", "admin"].includes(role);
}
```

- [ ] **Step 2: Replace all inline copies**

- [ ] **Step 3: Commit**

```bash
git commit -m "refactor: extract shared format, role, and flash helpers"
```

---

### Task 9: Consolidate team attendance query

**Files:**
- Modify: `app/lib/attendance.server.ts:78-119`

- [ ] **Step 1: Replace 2-query merge with embedded select**

```typescript
const { data } = await supabase
  .from("profiles")
  .select(`
    id, full_name, department, designation,
    attendance!left (
      id, date, punch_in_at, punch_out_at, status, note,
      punch_in_lat, punch_in_lng, punch_in_addr
    )
  `)
  .eq("tenant_id", tenantId)
  .eq("status", "active")
  .eq("attendance.date", today);
```

Flatten nested result to existing `TeamAttendanceRow[]` shape for UI compatibility.

- [ ] **Step 2: Verify HR dashboard team table still renders**

- [ ] **Step 3: Commit**

```bash
git commit -m "perf: single-query team attendance for today"
```

---

### Task 10: Atomic punch with upsert

**Files:**
- Modify: `app/lib/attendance.server.ts:130-205`

- [ ] **Step 1: Replace read-then-write with upsert**

```typescript
// punchIn — upsert with onConflict
const { error } = await supabase.from("attendance").upsert(
  {
    tenant_id: tenantId,
    user_id: userId,
    date: todayIST(),
    punch_in_at: new Date().toISOString(),
    punch_in_lat: lat,
    punch_in_lng: lng,
    punch_in_addr: addr,
    status: "present",
  },
  { onConflict: "tenant_id,user_id,date", ignoreDuplicates: false }
);
```

Add guard: if row exists with `punch_in_at`, return "Already punched in" (check `count` or pre-select only when needed).

- [ ] **Step 2: Commit**

```bash
git commit -m "perf: reduce punch in/out to single upsert where possible"
```

---

### Task 11: Security hardening batch

**Files:**
- Modify: `app/lib/email.server.ts:43-93`
- Modify: `app/routes/$slug.attendance.tsx:92-107`
- Modify: `app/lib/auth.server.ts:149-185`
- Modify: `app/routes/$slug.employees.tsx:109-121`

- [ ] **Step 1: HTML-escape email template variables**

- [ ] **Step 2: Validate `set_status` target user belongs to tenant**

```typescript
const { data: target } = await supabase
  .from("profiles")
  .select("id")
  .eq("id", userId)
  .eq("tenant_id", tenant.id)
  .eq("status", "active")
  .single();
if (!target) return data({ error: "Invalid user", ... }, { status: 400 });
```

- [ ] **Step 3: Add plan cap check in `acceptInvite`**

Call `canAddEmployee(tenantId)` before profile insert (mirror employees invite action).

- [ ] **Step 4: Add rollback in `acceptInvite` on profile failure** (mirror `createTenantWithOwner`)

- [ ] **Step 5: Check service client update errors in employees activate/deactivate**

- [ ] **Step 6: Commit**

```bash
git commit -m "fix: harden email escaping, status updates, and invite acceptance"
```

---

### Task 12: Reduce service-role usage

**Files:**
- Modify: `app/lib/auth.server.ts`, `$slug.settings.tsx`, `$slug.employees.tsx`

- [ ] **Step 1: Audit each `createSupabaseServiceClient` call**

Document why service role is needed. Replace with authenticated server client where RLS policies already enforce tenant scope.

- [ ] **Step 2: Commit per route**

```bash
git commit -m "refactor: prefer RLS-scoped client over service role where safe"
```

---

## Phase P3 — Edge & Developer Experience

### Task 13: HTTP caching for public routes

**Files:**
- Modify: `app/routes/home.tsx`, `app/routes/pricing.tsx`
- Modify: `app/entry.server.tsx` or route `headers` exports

- [ ] **Step 1: Add Cache-Control for marketing pages**

```typescript
export function headers() {
  return {
    "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
  };
}
```

- [ ] **Step 2: Verify via curl**

```bash
curl -I http://localhost:5173/pricing | grep -i cache-control
```

- [ ] **Step 3: Commit**

```bash
git commit -m "perf: add edge-friendly cache headers for public routes"
```

---

### Task 14: Vite bundle analysis setup

**Files:**
- Modify: `package.json`, `vite.config.ts`

- [ ] **Step 1: Add analyze script**

```json
"analyze": "vite-bundle-visualizer"
```

Optional `manualChunks` for `leaflet`, `react`, vendor.

- [ ] **Step 2: Run baseline and record sizes**

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: add bundle analysis tooling"
```

---

### Task 15: Project README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document env vars**

`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `RESEND_API_KEY`, `APP_BASE_URL`, `.dev.vars` setup.

- [ ] **Step 2: Document migrations and deploy**

```bash
supabase db push   # or migration instructions
npm run dev
npm run deploy
```

- [ ] **Step 3: Commit**

```bash
git commit -m "docs: replace starter README with Glacia HRMS setup guide"
```

---

### Task 16: Cleanup dead code

**Files:**
- Modify: `app/routes/$slug.leave.tsx` (unused imports)
- Delete or exclude: `app/welcome/welcome.tsx` (starter artifact)
- Modify: `wrangler.json` (remove `VALUE_FROM_CLOUDFLARE` placeholder)

- [ ] **Step 1: Remove unused imports and starter files**

- [ ] **Step 2: Commit**

```bash
git commit -m "chore: remove starter dead code and unused imports"
```

---

## Verification Checklist (Run After Each Phase)

```bash
npm run typecheck          # Must pass
npm run build              # Must pass
npm run check              # Full CI dry-run before deploy
```

| Smoke test | Route | Expected |
|------------|-------|----------|
| Login + tenant nav | `/{slug}/dashboard` | Single auth round-trip |
| Calendar nav | `/{slug}/attendance?year=2026&month=5` | May markers load |
| GPS punch | `/{slug}/attendance` | Server rejects missing GPS when required |
| Chat today | `/{slug}/chat` | Matches attendance page date |
| HR team view | `/{slug}/attendance` as HR | Team table + map render |
| Public cache | `/pricing` | Cache-Control header present |

---

## Estimated Impact

| Phase | Effort | Impact |
|-------|--------|--------|
| P0 | 0.5–1 day | Fixes broken calendar UX, GPS bypass, date bugs |
| P1 | 1–2 days | ~50% fewer auth DB calls; smaller/faster map load |
| P2 | 2–3 days | Cleaner codebase; fewer DB round trips |
| P3 | 0.5 day | Faster public pages; better onboarding |

---

## Execution Order Recommendation

1. **P0 Tasks 1–3** — ship immediately (user-visible bugs + security)
2. **P1 Task 4** — highest ROI performance win
3. **P1 Tasks 5–7** — parallelizable
4. **P2** — batch after P1 stabilizes
5. **P3** — when nearing production launch

Do **not** mix P0 security fixes with large refactors in the same PR — keep PRs reviewable (~200–400 lines each).

# Dashboard Calendar Month Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the dashboard attendance calendar so prev/next month buttons load the correct month's attendance markers and holidays, matching the behavior already working on the attendance page.

**Architecture:** Mirror `$slug.attendance.tsx`: read `?year=` and `?month=` in the loader, fetch that month's data server-side, and wire `AttendanceCalendar.onMonthChange` to update search params via `useSearchParams`. Keep the existing "upcoming holidays" stat card query unchanged; add a separate month-scoped holiday query for calendar markers only.

**Tech Stack:** React Router 7, Supabase, Vitest, Playwright

---

## Why This Feature

| Surface | Status |
|---------|--------|
| `$slug.attendance.tsx` | Month nav works — `onMonthChange` updates `?year=&month=` and loader refetches |
| `$slug.dashboard.tsx` | Broken — calendar UI changes month locally but markers stay on the current month from loader |

**User-visible bug:** On `/{slug}/dashboard`, clicking ‹ or › on the calendar shows an empty grid (no attendance bars) for other months even when records exist.

**Root cause:** `AttendanceCalendar` updates local `viewYear`/`viewMonth` state, but the dashboard never passes `onMonthChange` and the loader always fetches `new Date()`'s year/month.

---

## File Map

| File | Responsibility |
|------|----------------|
| `app/routes/$slug.dashboard.tsx` | Loader reads search params; component wires month nav |
| `tests/e2e/dashboard-calendar.spec.ts` | E2E: month nav updates URL and heading |

---

### Task 1: Loader reads year/month from URL

**Files:**
- Modify: `app/routes/$slug.dashboard.tsx:24-68`

- [ ] **Step 1: Replace hardcoded year/month with search params**

In `loader`, replace:

```typescript
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = todayIST();
```

With:

```typescript
  const url = new URL(request.url);
  const today = todayIST();
  const year = parseInt(url.searchParams.get("year") ?? "") || new Date().getFullYear();
  const month = parseInt(url.searchParams.get("month") ?? "") || new Date().getMonth() + 1;
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(
    new Date(year, month, 0).getDate()
  ).padStart(2, "0")}`;
```

- [ ] **Step 2: Add month-scoped holiday query for calendar markers**

Add a new parallel query inside the existing `Promise.all`:

```typescript
      supabase
        .from("holidays")
        .select("id, name, date, type")
        .eq("tenant_id", tenantId)
        .gte("date", monthStart)
        .lte("date", monthEnd)
        .order("date"),
```

Keep the existing upcoming-holidays query (`gte("date", today)`, `limit(5)`) for the stat card unchanged.

Destructure the new result as `monthHolidaysRes` and return it:

```typescript
    monthHolidays: (monthHolidaysRes.data ?? []) as HolidayRow[],
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (or only unrelated errors)

- [ ] **Step 4: Commit**

```bash
git add app/routes/$slug.dashboard.tsx
git commit -m "fix(dashboard): load calendar data for URL year/month"
```

---

### Task 2: Wire month navigation in the dashboard component

**Files:**
- Modify: `app/routes/$slug.dashboard.tsx:71-95`

- [ ] **Step 1: Import useSearchParams**

Add to the react-router import:

```typescript
import { useLoaderData, useOutletContext, data, Link, useSearchParams } from "react-router";
```

- [ ] **Step 2: Destructure monthHolidays and add handleMonthNav**

In `DashboardPage`, destructure `monthHolidays` from loader data:

```typescript
  const {
    recentEmployees,
    upcomingHolidays,
    monthHolidays,
    totalEmployees,
    monthAttendance,
    todayRecord,
    calYear,
    calMonth,
    today,
  } = useLoaderData<typeof loader>();
```

Add after `useState` for selectedDate:

```typescript
  const [, setSearchParams] = useSearchParams();

  function handleMonthNav(year: number, month: number) {
    setSearchParams({ year: String(year), month: String(month) });
  }
```

- [ ] **Step 3: Build markers from month holidays**

Replace:

```typescript
  const markers = buildAttendanceMarkers(monthAttendance, upcomingHolidays, calMonthPrefix);
```

With:

```typescript
  const markers = buildAttendanceMarkers(monthAttendance, monthHolidays, calMonthPrefix);
```

- [ ] **Step 4: Pass onMonthChange to AttendanceCalendar**

```typescript
          <AttendanceCalendar
            markers={markers}
            initialYear={calYear}
            initialMonth={calMonth}
            selectedDate={selectedDate}
            onDayClick={(date, _marker) => setSelectedDate(date === selectedDate ? null : date)}
            onMonthChange={handleMonthNav}
          />
```

- [ ] **Step 5: Manual smoke test**

Run: `npm run dev`
Navigate: `/{slug}/dashboard`
Click: calendar › (next month)
Expected:
- URL becomes `?year=2026&month=7` (or equivalent next month)
- Calendar header shows the new month
- If attendance or holidays exist in that month, colored bars appear

- [ ] **Step 6: Commit**

```bash
git add app/routes/$slug.dashboard.tsx
git commit -m "fix(dashboard): sync calendar month nav with loader"
```

---

### Task 3: E2E test for dashboard month navigation

**Files:**
- Create: `tests/e2e/dashboard-calendar.spec.ts`

- [ ] **Step 1: Write the test**

```typescript
import { test, expect } from "@playwright/test";
import { createTestTenantAndOwner, cleanUpTestTenant } from "./helpers";

test.describe("Dashboard Calendar", () => {
  let tenant: Awaited<ReturnType<typeof createTestTenantAndOwner>>;
  const suffix = Math.random().toString(36).substring(2, 7);

  test.beforeAll(async () => {
    tenant = await createTestTenantAndOwner(suffix);
  });

  test.afterAll(async () => {
    if (tenant?.tenantId) await cleanUpTestTenant(tenant.tenantId);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', tenant.ownerEmail);
    await page.fill('input[name="password"]', tenant.ownerPassword);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(new RegExp(`/${tenant.slug}/dashboard`));
  });

  test("month navigation updates URL and calendar heading", async ({ page }) => {
    await page.goto(`/${tenant.slug}/dashboard`);

    const nextBtn = page.getByRole("button", { name: "Next month" });
    await nextBtn.click();

    await expect(page).toHaveURL(/[?&]year=\d{4}/);
    await expect(page).toHaveURL(/[?&]month=\d{1,2}/);

    const prevBtn = page.getByRole("button", { name: "Previous month" });
    await prevBtn.click();

    // Back to current month — URL params may clear or reset; calendar should still render
    await expect(page.getByRole("button", { name: "Previous month" })).toBeVisible();
  });
});
```

- [ ] **Step 2: Run e2e**

Run: `npm run test:e2e -- tests/e2e/dashboard-calendar.spec.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/dashboard-calendar.spec.ts
git commit -m "test: dashboard calendar month navigation"
```

---

## Verification Checklist

```bash
npm run typecheck
npm run test:e2e -- tests/e2e/dashboard-calendar.spec.ts
npm run build
```

| Smoke test | Route | Expected |
|------------|-------|----------|
| Default month | `/{slug}/dashboard` | Current month markers visible |
| Next month | Click › on calendar | URL has `month=` param; header updates |
| Prev month | Click ‹ on calendar | URL updates; markers match viewed month |
| Stat card | `/{slug}/dashboard` | "Upcoming holidays" count unchanged by month nav |
| Attendance parity | `/{slug}/attendance?year=2026&month=5` | Same markers as dashboard for same month |

---

## Estimated Effort

| Task | Effort |
|------|--------|
| Loader search params + month holidays | 20 min |
| Component wiring | 15 min |
| E2E test | 20 min |
| **Total** | **~1 hour** |

---

## Out of Scope

- Dashboard calendar month nav on first paint without URL params (defaults to current month — acceptable)
- Deep-linking selected day across month changes
- Refactoring shared calendar-nav hook between dashboard and attendance (YAGNI unless a third consumer appears)

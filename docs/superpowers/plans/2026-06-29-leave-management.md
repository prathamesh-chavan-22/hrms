# Leave Management MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Phase 02 leave stub with a working leave flow — employees apply and track balances; HR approves or rejects — using the existing `leave_types` and `leave_requests` schema.

**Architecture:** Follow the established Glacia pattern: route loader/action → intent handlers → service (business rules) → repository (Supabase). Balance is computed in the service layer as `days_per_year − approved days used this calendar year`. No new tables; one small RLS migration so employees can cancel their own pending requests.

**Tech Stack:** React Router 7, Cloudflare Workers, Supabase RLS, Vitest, Playwright

---

## Why This Feature

| Route | Status |
|-------|--------|
| `$slug.leave.tsx` | Stub — "Under development" card only |
| `$slug.holidays.tsx` | Implemented (CRUD, year nav, HR actions) |
| `$slug.attendance.tsx` | Implemented (punch in/out, calendar, HR team view) |
| `$slug.chat.tsx` | Implemented (rule-based assistant) |

The database, seed data, RLS, and chat intent for leave already exist. The gap is entirely in application code and UI.

**Deferred to v2:** carry-forward across years, encashment, sick-leave document upload, HR leave-type CRUD, weekend/holiday-aware day counting.

---

## File Map

| File | Responsibility |
|------|----------------|
| `app/lib/repositories/leave.repository.ts` | Supabase queries for types, requests, usage |
| `app/lib/services/leave.service.ts` | Balance math, overlap checks, day count |
| `app/lib/services/leave.service.test.ts` | Unit tests for pure business logic |
| `app/lib/actions/leave/handlers.server.ts` | Intent handlers: apply, cancel, approve, reject |
| `app/routes/$slug.leave.tsx` | Page: balances, apply form, history, HR queue |
| `app/lib/chat/handlers.server.ts` | Show real remaining balance instead of type list |
| `app/components/TenantSidebar.tsx` | Remove `phase2: true` from Leave nav item |
| `supabase/migrations/005_leave_self_cancel.sql` | RLS policy for employee self-cancel |
| `tests/e2e/leave.spec.ts` | Smoke test for apply flow |

---

### Task 1: RLS policy for employee self-cancel

**Files:**
- Create: `supabase/migrations/005_leave_self_cancel.sql`

Employees can insert requests but cannot update them today. Cancel requires an update to `status = 'cancelled'`.

- [ ] **Step 1: Add migration**

```sql
-- Allow employees to cancel their own pending leave requests
create policy "leave_requests: self cancel pending" on leave_requests
  for update
  using (
    tenant_id = auth_tenant_id()
    and user_id = auth.uid()
    and status = 'pending'
  )
  with check (
    tenant_id = auth_tenant_id()
    and user_id = auth.uid()
    and status = 'cancelled'
  );
```

- [ ] **Step 2: Apply locally**

Run: `npx supabase db push` (or your usual migration workflow)

Expected: migration applies without error

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/005_leave_self_cancel.sql
git commit -m "feat(db): allow employees to cancel pending leave requests"
```

---

### Task 2: Leave repository

**Files:**
- Create: `app/lib/repositories/leave.repository.ts`

- [ ] **Step 1: Write repository**

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";

export type LeaveTypeRow = {
  id: string;
  name: string;
  code: string;
  days_per_year: number;
  is_active: boolean;
};

export type LeaveRequestRow = {
  id: string;
  user_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  leave_types?: { name: string; code: string } | null;
  profiles?: { full_name: string } | null;
};

export async function listActiveLeaveTypes(
  supabase: SupabaseClient,
  tenantId: string
) {
  return supabase
    .from("leave_types")
    .select("id, name, code, days_per_year, is_active")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("code");
}

export async function sumApprovedDaysForYear(
  supabase: SupabaseClient,
  params: { tenantId: string; userId: string; leaveTypeId: string; year: number }
) {
  return supabase
    .from("leave_requests")
    .select("total_days")
    .eq("tenant_id", params.tenantId)
    .eq("user_id", params.userId)
    .eq("leave_type_id", params.leaveTypeId)
    .eq("status", "approved")
    .gte("start_date", `${params.year}-01-01`)
    .lte("start_date", `${params.year}-12-31`);
}

export async function listLeaveRequestsForUser(
  supabase: SupabaseClient,
  params: { tenantId: string; userId: string; year: number }
) {
  return supabase
    .from("leave_requests")
    .select(
      "id, user_id, leave_type_id, start_date, end_date, total_days, reason, status, reviewed_by, reviewed_at, review_note, created_at, leave_types(name, code)"
    )
    .eq("tenant_id", params.tenantId)
    .eq("user_id", params.userId)
    .gte("start_date", `${params.year}-01-01`)
    .lte("start_date", `${params.year}-12-31`)
    .order("created_at", { ascending: false });
}

export async function listPendingLeaveRequests(
  supabase: SupabaseClient,
  tenantId: string
) {
  return supabase
    .from("leave_requests")
    .select(
      "id, user_id, leave_type_id, start_date, end_date, total_days, reason, status, created_at, leave_types(name, code), profiles(full_name)"
    )
    .eq("tenant_id", tenantId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
}

export async function createLeaveRequest(
  supabase: SupabaseClient,
  params: {
    tenantId: string;
    userId: string;
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    reason?: string;
  }
) {
  return supabase.from("leave_requests").insert({
    tenant_id: params.tenantId,
    user_id: params.userId,
    leave_type_id: params.leaveTypeId,
    start_date: params.startDate,
    end_date: params.endDate,
    total_days: params.totalDays,
    reason: params.reason?.trim() || null,
    status: "pending",
  });
}

export async function cancelLeaveRequest(
  supabase: SupabaseClient,
  params: { tenantId: string; userId: string; requestId: string }
) {
  return supabase
    .from("leave_requests")
    .update({ status: "cancelled" })
    .eq("id", params.requestId)
    .eq("tenant_id", params.tenantId)
    .eq("user_id", params.userId)
    .eq("status", "pending");
}

export async function reviewLeaveRequest(
  supabase: SupabaseClient,
  params: {
    tenantId: string;
    requestId: string;
    status: "approved" | "rejected";
    reviewedBy: string;
    reviewNote?: string;
  }
) {
  return supabase
    .from("leave_requests")
    .update({
      status: params.status,
      reviewed_by: params.reviewedBy,
      reviewed_at: new Date().toISOString(),
      review_note: params.reviewNote?.trim() || null,
    })
    .eq("id", params.requestId)
    .eq("tenant_id", params.tenantId)
    .eq("status", "pending");
}

export async function findOverlappingRequests(
  supabase: SupabaseClient,
  params: {
    tenantId: string;
    userId: string;
    startDate: string;
    endDate: string;
    excludeId?: string;
  }
) {
  let query = supabase
    .from("leave_requests")
    .select("id, start_date, end_date, status")
    .eq("tenant_id", params.tenantId)
    .eq("user_id", params.userId)
    .in("status", ["pending", "approved"])
    .lte("start_date", params.endDate)
    .gte("end_date", params.startDate);

  if (params.excludeId) query = query.neq("id", params.excludeId);
  return query;
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/lib/repositories/leave.repository.ts
git commit -m "feat: add leave repository"
```

---

### Task 3: Leave service (business logic + tests)

**Files:**
- Create: `app/lib/services/leave.service.ts`
- Create: `app/lib/services/leave.service.test.ts`
- Test: `app/lib/services/leave.service.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from "vitest";
import { countInclusiveDays, computeBalance } from "./leave.service";

describe("countInclusiveDays", () => {
  it("returns 1 for same-day range", () => {
    expect(countInclusiveDays("2026-06-01", "2026-06-01")).toBe(1);
  });

  it("returns inclusive span across days", () => {
    expect(countInclusiveDays("2026-06-01", "2026-06-05")).toBe(5);
  });

  it("throws when end is before start", () => {
    expect(() => countInclusiveDays("2026-06-05", "2026-06-01")).toThrow();
  });
});

describe("computeBalance", () => {
  it("subtracts approved usage from entitlement", () => {
    expect(computeBalance(15, 4)).toEqual({ entitled: 15, used: 4, remaining: 11 });
  });

  it("does not go negative", () => {
    expect(computeBalance(5, 8).remaining).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- app/lib/services/leave.service.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement service**

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  listActiveLeaveTypes,
  sumApprovedDaysForYear,
  listLeaveRequestsForUser,
  listPendingLeaveRequests,
  findOverlappingRequests,
  type LeaveTypeRow,
} from "~/lib/repositories/leave.repository";

export function countInclusiveDays(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (end < start) throw new Error("End date must be on or after start date.");
  return Math.floor((end - start) / 86_400_000) + 1;
}

export function computeBalance(entitled: number, used: number) {
  const remaining = Math.max(0, entitled - used);
  return { entitled, used, remaining };
}

export async function loadLeaveBalances(
  supabase: SupabaseClient,
  params: { tenantId: string; userId: string; year: number }
) {
  const { data: types } = await listActiveLeaveTypes(supabase, params.tenantId);
  const rows = (types ?? []) as LeaveTypeRow[];

  const balances = await Promise.all(
    rows.map(async (type) => {
      const { data: usageRows } = await sumApprovedDaysForYear(supabase, {
        tenantId: params.tenantId,
        userId: params.userId,
        leaveTypeId: type.id,
        year: params.year,
      });
      const used = (usageRows ?? []).reduce((sum, r) => sum + Number(r.total_days), 0);
      return {
        ...type,
        ...computeBalance(type.days_per_year, used),
      };
    })
  );

  return balances;
}

export async function loadLeavePageData(
  supabase: SupabaseClient,
  params: { tenantId: string; userId: string; year: number; isHR: boolean }
) {
  const [balances, requestsRes, pendingRes] = await Promise.all([
    loadLeaveBalances(supabase, params),
    listLeaveRequestsForUser(supabase, params),
    params.isHR ? listPendingLeaveRequests(supabase, params.tenantId) : Promise.resolve({ data: [] }),
  ]);

  return {
    balances,
    requests: requestsRes.data ?? [],
    pendingQueue: pendingRes.data ?? [],
  };
}

export async function validateNewLeaveRequest(
  supabase: SupabaseClient,
  params: {
    tenantId: string;
    userId: string;
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    year: number;
  }
) {
  const totalDays = countInclusiveDays(params.startDate, params.endDate);

  const balances = await loadLeaveBalances(supabase, {
    tenantId: params.tenantId,
    userId: params.userId,
    year: params.year,
  });
  const typeBalance = balances.find((b) => b.id === params.leaveTypeId);
  if (!typeBalance) return { error: "Invalid leave type." };
  if (totalDays > typeBalance.remaining) {
    return { error: `Insufficient balance. ${typeBalance.remaining} day(s) remaining for ${typeBalance.code}.` };
  }

  const { data: overlaps } = await findOverlappingRequests(supabase, {
    tenantId: params.tenantId,
    userId: params.userId,
    startDate: params.startDate,
    endDate: params.endDate,
  });
  if ((overlaps ?? []).length > 0) {
    return { error: "Dates overlap with an existing pending or approved request." };
  }

  return { totalDays };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- app/lib/services/leave.service.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add app/lib/services/leave.service.ts app/lib/services/leave.service.test.ts
git commit -m "feat: add leave balance and validation service"
```

---

### Task 4: Intent handlers

**Files:**
- Create: `app/lib/actions/leave/handlers.server.ts`

- [ ] **Step 1: Implement handlers**

```typescript
import type { IntentHandler } from "../intent-handler.server";
import { actionSuccess, actionError } from "../action-result";
import { requireTenantAccess, requireHR } from "~/lib/auth/guards.server";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { getTrimmedString } from "~/lib/validation/form-data";
import { isValidIsoDate } from "~/lib/validation/date";
import {
  createLeaveRequest,
  cancelLeaveRequest,
  reviewLeaveRequest,
} from "~/lib/repositories/leave.repository";
import { validateNewLeaveRequest } from "~/lib/services/leave.service";

async function getLeaveContext(ctx: Parameters<IntentHandler>[0]) {
  const slug = ctx.params.slug!;
  const { profile, tenant } = await requireTenantAccess(ctx.request, ctx.env, slug);
  const { supabase } = createSupabaseServerClient(ctx.request, ctx.env);
  return { profile, tenant, supabase };
}

export const applyLeaveHandler: IntentHandler = async (ctx) => {
  const intent = "apply_leave";
  const { profile, tenant, supabase } = await getLeaveContext(ctx);

  const leaveTypeId = getTrimmedString(ctx.form, "leave_type_id");
  const startDate = getTrimmedString(ctx.form, "start_date");
  const endDate = getTrimmedString(ctx.form, "end_date");
  const reason = getTrimmedString(ctx.form, "reason");

  if (!leaveTypeId) return actionError("Leave type is required.", intent);
  if (!startDate || !endDate) return actionError("Start and end dates are required.", intent);
  if (!isValidIsoDate(startDate) || !isValidIsoDate(endDate)) {
    return actionError("Invalid date.", intent);
  }

  const year = new Date(startDate + "T00:00:00").getFullYear();
  const validation = await validateNewLeaveRequest(supabase, {
    tenantId: tenant.id,
    userId: profile.id,
    leaveTypeId,
    startDate,
    endDate,
    year,
  });
  if ("error" in validation) return actionError(validation.error, intent);

  const { error } = await createLeaveRequest(supabase, {
    tenantId: tenant.id,
    userId: profile.id,
    leaveTypeId,
    startDate,
    endDate,
    totalDays: validation.totalDays,
    reason,
  });
  if (error) return actionError("Failed to submit leave request.", intent, 500);

  return actionSuccess("Leave request submitted.", intent);
};

export const cancelLeaveHandler: IntentHandler = async (ctx) => {
  const intent = "cancel_leave";
  const { profile, tenant, supabase } = await getLeaveContext(ctx);
  const requestId = getTrimmedString(ctx.form, "id");
  if (!requestId) return actionError("Request ID is required.", intent);

  const { error, count } = await cancelLeaveRequest(supabase, {
    tenantId: tenant.id,
    userId: profile.id,
    requestId,
  });
  if (error || count === 0) return actionError("Could not cancel request.", intent, 400);

  return actionSuccess("Leave request cancelled.", intent);
};

export const approveLeaveHandler: IntentHandler = async (ctx) => {
  const intent = "approve_leave";
  const slug = ctx.params.slug!;
  const { profile, tenant } = await requireHR(ctx.request, ctx.env, slug);
  const { supabase } = createSupabaseServerClient(ctx.request, ctx.env);

  const requestId = getTrimmedString(ctx.form, "id");
  const reviewNote = getTrimmedString(ctx.form, "review_note");
  if (!requestId) return actionError("Request ID is required.", intent);

  const { error } = await reviewLeaveRequest(supabase, {
    tenantId: tenant.id,
    requestId,
    status: "approved",
    reviewedBy: profile.id,
    reviewNote,
  });
  if (error) return actionError("Failed to approve request.", intent, 500);

  return actionSuccess("Leave approved.", intent);
};

export const rejectLeaveHandler: IntentHandler = async (ctx) => {
  const intent = "reject_leave";
  const slug = ctx.params.slug!;
  const { profile, tenant } = await requireHR(ctx.request, ctx.env, slug);
  const { supabase } = createSupabaseServerClient(ctx.request, ctx.env);

  const requestId = getTrimmedString(ctx.form, "id");
  const reviewNote = getTrimmedString(ctx.form, "review_note");
  if (!requestId) return actionError("Request ID is required.", intent);

  const { error } = await reviewLeaveRequest(supabase, {
    tenantId: tenant.id,
    requestId,
    status: "rejected",
    reviewedBy: profile.id,
    reviewNote,
  });
  if (error) return actionError("Failed to reject request.", intent, 500);

  return actionSuccess("Leave rejected.", intent);
};

export const leaveIntentHandlers: Record<string, IntentHandler> = {
  apply_leave: applyLeaveHandler,
  cancel_leave: cancelLeaveHandler,
  approve_leave: approveLeaveHandler,
  reject_leave: rejectLeaveHandler,
};
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/lib/actions/leave/handlers.server.ts
git commit -m "feat: add leave intent handlers"
```

---

### Task 5: Leave page UI

**Files:**
- Modify: `app/routes/$slug.leave.tsx` (replace stub entirely)

Mirror patterns from `$slug.holidays.tsx`: loader with `requireChildLoaderAuth`, action with `dispatchIntent`, `FlashMessage`, `IcyCard`, modal form panel, HR-only sections.

**Page sections:**
1. Header + "Apply Leave" button
2. Balance cards grid (one per active leave type: entitled / used / remaining)
3. Year navigator (reuse holidays pattern with `?year=` search param)
4. My requests table (status badge, cancel button for pending)
5. HR pending queue (approve/reject forms with optional note) — visible when `isHR(role)`

- [ ] **Step 1: Replace route with loader/action/page**

Loader calls `loadLeavePageData` from service. Action dispatches to `leaveIntentHandlers`. Use `Badge` + `statusBadge` for request status (map pending→yellow, approved→green, rejected→red, cancelled→muted).

Apply form fields: `leave_type_id` (select from balances), `start_date`, `end_date`, `reason` (optional textarea).

- [ ] **Step 2: Manual smoke test**

Run: `npm run dev`
Navigate: `/{slug}/leave`
Expected:
- Balance cards show seeded types (EL 15, CL 12, etc.)
- Apply form creates pending request
- HR sees pending queue and can approve

- [ ] **Step 3: Commit**

```bash
git add app/routes/$slug.leave.tsx
git commit -m "feat: implement leave management page"
```

---

### Task 6: Sidebar + chat balance fix

**Files:**
- Modify: `app/components/TenantSidebar.tsx:44`
- Modify: `app/lib/chat/handlers.server.ts:13-22`

- [ ] **Step 1: Remove phase2 flag from Leave nav**

```typescript
// Before
{ to: `/${slug}/leave`, label: "Leave", icon: <NavIcon path={ICONS.leave} />, phase2: true },

// After
{ to: `/${slug}/leave`, label: "Leave", icon: <NavIcon path={ICONS.leave} /> },
```

- [ ] **Step 2: Update chat leave balance handler**

Replace static type list with real remaining balances using `loadLeaveBalances`:

```typescript
export const leaveBalanceHandler: ChatQueryHandler = async ({ supabase, profile, tenant }) => {
  const year = new Date().getFullYear();
  const balances = await loadLeaveBalances(supabase, {
    tenantId: tenant.id,
    userId: profile.id,
    year,
  });
  const list = balances
    .filter((b) => b.days_per_year > 0)
    .map((b) => `${b.code}: ${b.remaining}/${b.entitled} remaining`)
    .join(", ");
  return list ? `Your leave balance: ${list}.` : "No leave types configured yet.";
};
```

- [ ] **Step 3: Commit**

```bash
git add app/components/TenantSidebar.tsx app/lib/chat/handlers.server.ts
git commit -m "feat: enable leave nav and show real balances in chat"
```

---

### Task 7: E2E smoke test

**Files:**
- Create: `tests/e2e/leave.spec.ts`

- [ ] **Step 1: Add test**

```typescript
import { test, expect } from "@playwright/test";
import { createTestTenantAndOwner, cleanUpTestTenant } from "./helpers";

test.describe("Leave Management", () => {
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

  test("employee can apply leave and HR can approve", async ({ page }) => {
    await page.goto(`/${tenant.slug}/leave`);
    await expect(page.getByRole("heading", { name: /Apply & track balance/i })).toBeVisible();

    await page.getByRole("button", { name: /Apply Leave/i }).click();
    await page.selectOption('select[name="leave_type_id"]', { index: 1 });
    await page.fill('input[name="start_date"]', "2026-07-01");
    await page.fill('input[name="end_date"]', "2026-07-02");
    await page.getByRole("button", { name: /Submit/i }).click();

    await expect(page.getByText("Leave request submitted")).toBeVisible();
    await expect(page.getByText("pending", { exact: false })).toBeVisible();

    await page.getByRole("button", { name: /Approve/i }).first().click();
    await expect(page.getByText("Leave approved")).toBeVisible();
  });
});
```

Adjust selectors to match final UI button labels.

- [ ] **Step 2: Run e2e**

Run: `npm run test:e2e -- tests/e2e/leave.spec.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/leave.spec.ts
git commit -m "test: add leave apply and approve e2e smoke test"
```

---

## Verification Checklist

```bash
npm run typecheck
npm test -- app/lib/services/leave.service.test.ts
npm run test:e2e -- tests/e2e/leave.spec.ts
npm run build
```

| Smoke test | Route | Expected |
|------------|-------|----------|
| Balances | `/{slug}/leave` | EL/CL/SL cards with remaining days |
| Apply | `/{slug}/leave` | Pending request appears in history |
| Cancel | `/{slug}/leave` | Pending → cancelled |
| HR approve | `/{slug}/leave` as HR | Status approved, balance decreases |
| HR reject | `/{slug}/leave` as HR | Status rejected, balance unchanged |
| Chat | `/{slug}/chat` "my leave balance" | Shows remaining/total per type |
| Nav | Sidebar | Leave no longer shows "SOON" |

---

## Estimated Effort

| Task | Effort |
|------|--------|
| RLS migration | 15 min |
| Repository + service + tests | 1–2 hrs |
| Intent handlers | 45 min |
| Page UI | 2–3 hrs |
| Sidebar + chat | 20 min |
| E2E test | 30 min |
| **Total** | **~1 day** |

---

## v2 Backlog (Out of Scope)

- Weekend and holiday exclusion in `total_days`
- Carry-forward and encashment rules from `leave_types` columns
- HR leave-type configuration UI in Settings
- Document upload for sick leave (`requires_doc`, `doc_after_days`)
- Email notifications on approve/reject

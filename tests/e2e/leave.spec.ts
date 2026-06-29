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

  test("owner can apply leave and approve", async ({ page }) => {
    await page.goto(`/${tenant.slug}/leave`);
    await expect(page.getByRole("heading", { name: /Apply & track balance/i })).toBeVisible();

    await page.getByRole("button", { name: /Apply Leave/i }).click();
    await page.selectOption('select[name="leave_type_id"]', { index: 0 });
    await page.fill('input[name="start_date"]', "2026-07-01");
    await page.fill('input[name="end_date"]', "2026-07-02");
    await page.getByRole("button", { name: /Submit Request/i }).click();

    await expect(page.getByText("Leave request submitted")).toBeVisible();
    await expect(page.getByText("pending", { exact: false })).toBeVisible();

    await page.getByRole("button", { name: "Approve" }).first().click();
    await expect(page.getByText("Leave approved")).toBeVisible();
  });
});

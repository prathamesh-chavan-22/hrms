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

    await expect(page.getByRole("button", { name: "Previous month" })).toBeVisible();
  });
});

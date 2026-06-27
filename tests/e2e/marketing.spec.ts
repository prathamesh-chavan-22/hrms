import { test, expect } from "@playwright/test";

test.describe("Marketing Pages", () => {
  test("Landing page loads and displays core details", async ({ page }) => {
    await page.goto("/");

    // Check title
    await expect(page).toHaveTitle("Glacia — HRMS for Growing Teams");

    // Check header/logo
    const logo = page.locator(".topbar").getByText("GLACIA");
    await expect(logo).toBeVisible();

    // Check main call to action buttons
    const requestAccountBtn = page.getByRole("button", { name: "Request Company Account" }).first();
    await expect(requestAccountBtn).toBeVisible();

    const viewPricingBtn = page.getByRole("button", { name: "View Pricing" }).first();
    await expect(viewPricingBtn).toBeVisible();

    // Verify presence of features section
    await expect(page.getByText("GPS ATTENDANCE", { exact: true })).toBeVisible();
    await expect(page.getByText("LEAVE POLICY", { exact: true })).toBeVisible();
  });

  test("Pricing page loads and displays plans", async ({ page }) => {
    await page.goto("/pricing");

    // Check title
    await expect(page).toHaveTitle("Pricing — Glacia HRMS");

    // Check header
    await expect(page.locator("h1")).toContainText("Simple. Transparent.");

    // Check pricing plans
    await expect(page.getByText("STARTER", { exact: true })).toBeVisible();
    await expect(page.getByText("PLUS", { exact: true })).toBeVisible();
    await expect(page.getByText("PRO", { exact: true })).toBeVisible();

    // Verify navigation back to home via logo
    await page.locator(".topbar").getByRole("link").first().click();
    await expect(page).toHaveURL("/");
  });
});

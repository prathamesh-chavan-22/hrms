import { test, expect } from "@playwright/test";
import { supabaseAdmin } from "./helpers";

test.describe("Authentication and Signup", () => {
  let createdSlugs: string[] = [];

  test.afterAll(async () => {
    // Clean up any company requests created during test
    if (createdSlugs.length > 0) {
      await supabaseAdmin
        .from("company_requests")
        .delete()
        .in("slug", createdSlugs);
    }
  });

  test("Login page validations", async ({ page }) => {
    await page.goto("/login");

    // Click sign in directly to check HTML5 validation or form response
    await page.getByRole("button", { name: "Sign In" }).click();

    // Check that we're still on the login page
    await expect(page).toHaveURL(/\/login/);

    // Try logging in with incorrect credentials
    await page.fill('input[name="email"]', "nonexistent-user-12345@example.com");
    await page.fill('input[name="password"]', "WrongPassword123!");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Verify error message is displayed
    const errorAlert = page.locator("div.bevel-sunken.text-err");
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText("Invalid email or password");
  });

  test("Signup page validations (invalid slug)", async ({ page }) => {
    await page.goto("/signup");

    // Enter invalid slug (contains uppercase and spaces)
    await page.fill('input[name="companyName"]', "Validation Company");
    await page.fill('input[name="slug"]', "INVALID SLUG!");
    await page.fill('input[name="ownerName"]', "Validation Owner");
    await page.fill('input[name="ownerEmail"]', "val-owner@example.com");

    await page.getByRole("button", { name: "Request Company Account" }).click();

    // Verify server-side or client-side slug validation error
    const errorAlert = page.locator(".text-err");
    // Depending on whether it's field-level or form-level error
    await expect(errorAlert.first()).toBeVisible();
  });

  test("Successful Company Request submission", async ({ page }) => {
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const companySlug = `auto-test-slug-${randomSuffix}`;
    createdSlugs.push(companySlug);

    await page.goto("/signup");

    await page.fill('input[name="companyName"]', `Auto Test Company ${randomSuffix}`);
    await page.fill('input[name="slug"]', companySlug);
    await page.fill('input[name="ownerName"]', `Auto Owner ${randomSuffix}`);
    await page.fill('input[name="ownerEmail"]', `auto-owner-${randomSuffix}@example.com`);

    await page.getByRole("button", { name: "Request Company Account" }).click();

    // Verify request submission screen
    await expect(page.getByText("REQUEST SUBMITTED")).toBeVisible();
    await expect(page.getByText("We'll be in touch")).toBeVisible();

    // Verify presence of return button
    const backBtn = page.getByRole("button", { name: "Back to Sign In" });
    await expect(backBtn).toBeVisible();
    await backBtn.click();
    await expect(page).toHaveURL(/\/login/);
  });
});

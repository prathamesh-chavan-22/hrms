import { test, expect } from "@playwright/test";
import { createTestTenantAndOwner, cleanUpTestTenant } from "./helpers";

test.describe("Tenant Scoped Features", () => {
  let tenant: any;
  const suffix = Math.random().toString(36).substring(2, 7);

  test.beforeAll(async () => {
    // Dynamically create a test tenant and owner
    tenant = await createTestTenantAndOwner(suffix);
  });

  test.afterAll(async () => {
    // Clean up the created test tenant and users
    if (tenant?.tenantId) {
      await cleanUpTestTenant(tenant.tenantId);
    }
  });

  test.beforeEach(async ({ page }) => {
    // 1. Mock geolocation API at the browser window level for robust, consistent testing
    await page.addInitScript(() => {
      navigator.geolocation.getCurrentPosition = (success) => {
        success({
          coords: {
            latitude: 12.9716,
            longitude: 77.5946,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        });
      };
    });

    // 2. Automatically log in as tenant owner before each test
    await page.goto("/login");
    await page.fill('input[name="email"]', tenant.ownerEmail);
    await page.fill('input[name="password"]', tenant.ownerPassword);
    await page.getByRole("button", { name: "Sign In" }).click();

    // Verify redirected to dashboard
    await expect(page).toHaveURL(new RegExp(`/${tenant.slug}/dashboard`));
  });

  test("Dashboard and Attendance Punch Flow", async ({ page }) => {
    // 1. Mock reverse geocoding API to prevent hitting real OpenStreetMap server
    await page.route("**/nominatim.openstreetmap.org/reverse**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          display_name: "Mocked Office Location, Bengaluru, Karnataka, India",
        }),
      });
    });

    // Verify tenant branding elements using exact class locator
    await expect(
      page.locator(".chip").getByText(tenant.name.toUpperCase(), { exact: true })
    ).toBeVisible();

    // 2. Punch In Flow
    // Click "→ PUNCH IN" link on the dashboard today status bar
    await page.click('a:has-text("PUNCH IN")');
    await expect(page).toHaveURL(new RegExp(`/${tenant.slug}/attendance`));

    // Click Acquire GPS
    await page.click('button:has-text("ACQUIRE GPS LOCK")');
    // Expect coordinates chip
    await expect(page.getByText("GPS LOCK · 12.9716, 77.5946")).toBeVisible();

    // Submit Punch In
    await page.click('button:has-text("PUNCH IN")');

    // Expect Success message or Punch status change
    await expect(page.getByText("PUNCHED IN SUCCESSFULLY")).toBeVisible();

    // Verify Punch Out button is now visible
    const punchOutBtn = page.locator('button:has-text("PUNCH OUT")');
    await expect(punchOutBtn).toBeVisible();

    // 3. Punch Out Flow
    await punchOutBtn.click();
    await expect(page.getByText("PUNCHED OUT SUCCESSFULLY")).toBeVisible();

    // Verify calendar today marker matches
    await page.goto(`/${tenant.slug}/dashboard`);
    await expect(page.getByText("COMPLETE")).toBeVisible();
  });

  test("Employee Directory and Invitation Flow", async ({ page }) => {
    await page.goto(`/${tenant.slug}/employees`);

    // Verify current list contains the owner inside the directory table specifically
    await expect(page.getByRole("table").getByText(tenant.ownerName)).toBeVisible();

    // Click "+ Invite Employee"
    await page.click('button:has-text("Invite Employee")');

    // Fill the invite form
    const inviteEmail = `test-invite-${suffix}@example.com`;
    await page.fill('input[name="email"]', inviteEmail);
    
    // Select role if visible
    const roleSelect = page.locator('select[name="role"]');
    if (await roleSelect.isVisible()) {
      await roleSelect.selectOption("employee");
    }

    // Submit Invitation
    await page.click('button:has-text("Send Invitation")');

    // Verify success flash message
    await expect(page.getByText("INVITATION SENT TO")).toBeVisible();

    // Verify the email is present in the pending invites section
    await expect(page.getByText(inviteEmail)).toBeVisible();
  });
});

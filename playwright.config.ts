import { defineConfig, devices } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load environment variables from .dev.vars for tests
try {
  const envPath = resolve(".dev.vars");
  const envContent = readFileSync(envPath, "utf8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const index = trimmed.indexOf("=");
      if (index !== -1) {
        const key = trimmed.slice(0, index).trim();
        const value = trimmed.slice(index + 1).trim();
        process.env[key] = value;
      }
    }
  });
} catch (e) {
  console.warn("Could not load environment variables from .dev.vars:", e);
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // Turn off fully parallel to avoid race conditions on db states
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Use single worker to ensure DB state mutations don't clash
  reporter: "html",
  use: {
    baseURL: process.env.APP_BASE_URL || "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
  webServer: {
    command: "npm run build && npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 30000,
  },
});

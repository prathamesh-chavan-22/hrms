import { describe, it, expect } from "vitest";
import { isValidSlug } from "~/lib/auth/constants";
import { getSuperAdminRedirect, getLoginRedirect } from "~/lib/auth/helpers";
import { validatePassword, validatePasswordConfirmation } from "~/lib/validation/password";
import { buildAttendanceMarkers } from "~/lib/attendance-markers";
import { renderEmailHtml } from "~/lib/email/templates";

describe("isValidSlug", () => {
  it("accepts valid slugs", () => {
    expect(isValidSlug("acme-corp")).toBe(true);
    expect(isValidSlug("a1b")).toBe(true);
  });

  it("rejects invalid slugs", () => {
    expect(isValidSlug("ab")).toBe(false);
    expect(isValidSlug("UPPER")).toBe(false);
    expect(isValidSlug("-start")).toBe(false);
  });
});

describe("getSuperAdminRedirect", () => {
  it("returns admin path for super admin email", () => {
    const env = { SUPER_ADMIN_EMAIL: "admin@test.com" } as Env;
    expect(getSuperAdminRedirect("admin@test.com", env)).toBe("/admin/company-requests");
  });

  it("returns null for non-super-admin", () => {
    const env = { SUPER_ADMIN_EMAIL: "admin@test.com" } as Env;
    expect(getSuperAdminRedirect("user@test.com", env)).toBeNull();
  });
});

describe("getLoginRedirect", () => {
  it("redirects to change-password when required", () => {
    expect(getLoginRedirect({ must_change_password: true, tenant: { slug: "acme" } })).toBe(
      "/change-password"
    );
  });

  it("redirects to tenant dashboard", () => {
    expect(getLoginRedirect({ must_change_password: false, tenant: { slug: "acme" } })).toBe(
      "/acme/dashboard"
    );
  });
});

describe("validatePassword", () => {
  it("rejects short passwords", () => {
    expect(validatePassword("short")).toBe("Password must be at least 8 characters");
  });

  it("accepts valid passwords", () => {
    expect(validatePassword("longenough")).toBeNull();
  });
});

describe("validatePasswordConfirmation", () => {
  it("rejects mismatched passwords", () => {
    expect(validatePasswordConfirmation("password1", "password2")).toBe("Passwords do not match");
  });
});

describe("buildAttendanceMarkers", () => {
  it("merges attendance and holidays for the month", () => {
    const markers = buildAttendanceMarkers(
      [{ date: "2026-06-10", status: "present" }],
      [{ date: "2026-06-15", name: "Holiday" }],
      "2026-06"
    );
    expect(markers).toHaveLength(2);
    expect(markers[0].kind).toBe("present");
    expect(markers[1].kind).toBe("holiday");
    expect(markers[1].label).toBe("Holiday");
  });

  it("filters holidays outside month prefix", () => {
    const markers = buildAttendanceMarkers(
      [],
      [{ date: "2026-07-01", name: "July Holiday" }],
      "2026-06"
    );
    expect(markers).toHaveLength(0);
  });
});

describe("renderEmailHtml", () => {
  it("escapes HTML in title", () => {
    const html = renderEmailHtml({
      title: '<script>alert("xss")</script>',
      bodyHtml: "<p>Body</p>",
      styled: false,
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("includes CTA when provided", () => {
    const html = renderEmailHtml({
      title: "Test",
      bodyHtml: "<p>Hello</p>",
      cta: { label: "Click", href: "https://example.com" },
      styled: false,
    });
    expect(html).toContain("https://example.com");
    expect(html).toContain("Click");
  });
});

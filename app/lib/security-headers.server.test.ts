import { describe, expect, it } from "vitest";
import { applySecurityHeaders } from "./security-headers.server";

describe("applySecurityHeaders", () => {
  it("allows framework scripts by nonce while keeping inline style attributes compatible", () => {
    const headers = new Headers();

    applySecurityHeaders(
      headers,
      new Request("https://glacia.example/dashboard"),
      "https://example.supabase.co",
      "abc123",
    );

    const csp = headers.get("Content-Security-Policy") ?? "";
    expect(csp).toContain("script-src 'self' 'nonce-abc123'");
    expect(csp).toContain("style-src-attr 'unsafe-inline'");
    expect(csp).toContain("style-src-elem 'self' https://fonts.googleapis.com 'nonce-abc123'");
    expect(csp).toContain("connect-src 'self' https://nominatim.openstreetmap.org https://example.supabase.co");
    expect(csp).toContain("object-src 'none'");
    expect(headers.get("Strict-Transport-Security")).toBe("max-age=31536000; includeSubDomains");
  });
});

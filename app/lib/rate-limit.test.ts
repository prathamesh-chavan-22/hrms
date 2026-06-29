import { describe, expect, it, vi, beforeEach } from "vitest";
import { checkRateLimit, rateLimitKey } from "./rate-limit.server";

function createMockKv() {
  const store = new Map<string, { value: string; metadata?: { expiresAt: number } }>();
  return {
    get: vi.fn(async (key: string) => store.get(key)?.value ?? null),
    getWithMetadata: vi.fn(async (key: string) => ({
      value: store.get(key)?.value ?? null,
      metadata: store.get(key)?.metadata ?? null,
    })),
    put: vi.fn(async (key: string, value: string, opts?: { metadata?: { expiresAt: number } }) => {
      store.set(key, { value, metadata: opts?.metadata });
    }),
    store,
  } as unknown as KVNamespace & { store: Map<string, { value: string; metadata?: { expiresAt: number } }> };
}

describe("checkRateLimit", () => {
  let kv: ReturnType<typeof createMockKv>;

  beforeEach(() => {
    kv = createMockKv();
  });

  it("allows requests under the limit", async () => {
    const key = rateLimitKey("login", "1.2.3.4");
    const result = await checkRateLimit(kv, { key, limit: 3, windowSeconds: 60 });
    expect(result.allowed).toBe(true);
    expect(kv.store.get(key)?.value).toBe("1");
  });

  it("blocks requests at the limit", async () => {
    const key = rateLimitKey("login", "1.2.3.4");
    await checkRateLimit(kv, { key, limit: 2, windowSeconds: 60 });
    await checkRateLimit(kv, { key, limit: 2, windowSeconds: 60 });
    const blocked = await checkRateLimit(kv, { key, limit: 2, windowSeconds: 60 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });
});

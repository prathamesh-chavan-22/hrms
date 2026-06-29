import { data } from "react-router";

export type RateLimitConfig = {
  endpoint: string;
  limit: number;
  windowSeconds: number;
  keys: string[];
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds?: number;
};

function getClientIp(request: Request): string {
  return (
    request.headers.get("CF-Connecting-IP") ??
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export function rateLimitKey(endpoint: string, identifier: string): string {
  return `rl:${endpoint}:${identifier}`;
}

export function clientIpKey(request: Request): string {
  return getClientIp(request);
}

/** Increment a KV counter; returns whether the request is within limit. */
export async function checkRateLimit(
  kv: KVNamespace,
  params: { key: string; limit: number; windowSeconds: number },
): Promise<RateLimitResult> {
  const { key, limit, windowSeconds } = params;
  const currentRaw = await kv.get(key);
  const current = currentRaw ? Number.parseInt(currentRaw, 10) : 0;

  if (current >= limit) {
    const ttl = await kv.getWithMetadata<{ expiresAt: number }>(key, "metadata");
    const retryAfterSeconds = ttl.metadata?.expiresAt
      ? Math.max(1, Math.ceil((ttl.metadata.expiresAt - Date.now()) / 1000))
      : windowSeconds;
    return { allowed: false, retryAfterSeconds };
  }

  const next = current + 1;
  const expiresAt = Date.now() + windowSeconds * 1000;
  await kv.put(key, String(next), {
    expirationTtl: windowSeconds,
    metadata: { expiresAt },
  });

  return { allowed: true };
}

/** Check one or more rate-limit keys; throws data() response with 429 when exceeded. */
export async function enforceRateLimit(
  request: Request,
  env: Env,
  config: RateLimitConfig,
): Promise<void> {
  const kv = env.RATE_LIMIT_KV;
  if (!kv) return;

  for (const identifier of config.keys) {
    const result = await checkRateLimit(kv, {
      key: rateLimitKey(config.endpoint, identifier),
      limit: config.limit,
      windowSeconds: config.windowSeconds,
    });

    if (!result.allowed) {
      const headers = new Headers();
      if (result.retryAfterSeconds) {
        headers.set("Retry-After", String(result.retryAfterSeconds));
      }
      throw data(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers },
      );
    }
  }
}

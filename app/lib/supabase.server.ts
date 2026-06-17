import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database";

export type { SupabaseClient };

export function createSupabaseServerClient(request: Request, env: Env) {
  const cookies: { name: string; value: string }[] = [];

  const supabase = createServerClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get("Cookie") ?? "");
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookies.push({ name, value, ...options } as { name: string; value: string })
          );
        },
      },
    }
  );

  return { supabase, cookies };
}

export function createSupabaseServiceClient(env: Env) {
  return createServerClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_SECRET_KEY,
    {
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export function appendCookieHeaders(headers: Headers, cookies: { name: string; value: string; [key: string]: unknown }[]) {
  cookies.forEach((cookie) => {
    headers.append(
      "Set-Cookie",
      serializeCookieHeader(cookie.name, cookie.value, cookie as Record<string, unknown>)
    );
  });
  return headers;
}

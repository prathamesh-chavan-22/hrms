import { redirect } from "react-router";
import type { Route } from "./+types/logout";
import { createSupabaseServerClient, appendCookieHeaders } from "~/lib/supabase.server";

export async function action({ request, context }: Route.ActionArgs) {
  const { supabase, cookies } = createSupabaseServerClient(request, context.cloudflare.env);
  await supabase.auth.signOut();
  const headers = appendCookieHeaders(new Headers(), cookies);
  headers.set("Location", "/login");
  return new Response(null, { status: 302, headers });
}

export async function loader() {
  return redirect("/login");
}

import type { SupabaseClient } from "@supabase/supabase-js";

export async function listPendingInvites(supabase: SupabaseClient, tenantId: string) {
  const now = new Date().toISOString();
  return supabase
    .from("invites")
    .select("id, email, role, expires_at, created_at")
    .eq("tenant_id", tenantId)
    .is("accepted_at", null)
    .gt("expires_at", now)
    .order("created_at", { ascending: false });
}

export async function countPendingInvites(supabase: SupabaseClient, tenantId: string) {
  const now = new Date().toISOString();
  return supabase
    .from("invites")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .is("accepted_at", null)
    .gt("expires_at", now);
}

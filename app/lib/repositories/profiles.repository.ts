import type { SupabaseClient } from "@supabase/supabase-js";

export async function listEmployees(
  supabase: SupabaseClient,
  tenantId: string
) {
  return supabase
    .from("profiles")
    .select(
      "id, full_name, email, role, status, department, designation, employee_code, date_of_joining, created_at, must_change_password"
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
}

export async function countProfiles(supabase: SupabaseClient, tenantId: string) {
  return supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
}

export async function profileExistsInTenant(
  supabase: SupabaseClient,
  params: { userId: string; tenantId: string }
) {
  return supabase
    .from("profiles")
    .select("id")
    .eq("id", params.userId)
    .eq("tenant_id", params.tenantId)
    .maybeSingle();
}

import type { SupabaseClient } from "@supabase/supabase-js";

export async function listUpcomingHolidays(
  supabase: SupabaseClient,
  params: { tenantId: string; fromDate: string; limit?: number }
) {
  let query = supabase
    .from("holidays")
    .select("id, name, date, type")
    .eq("tenant_id", params.tenantId)
    .gte("date", params.fromDate)
    .order("date");

  if (params.limit) query = query.limit(params.limit);
  return query;
}

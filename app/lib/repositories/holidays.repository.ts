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

export async function listHolidaysForYear(
  supabase: SupabaseClient,
  tenantId: string,
  year: number
) {
  return supabase
    .from("holidays")
    .select("id, name, date, type, description")
    .eq("tenant_id", tenantId)
    .gte("date", `${year}-01-01`)
    .lte("date", `${year}-12-31`)
    .order("date");
}

export async function createHoliday(
  supabase: SupabaseClient,
  params: {
    tenantId: string;
    name: string;
    date: string;
    type: string;
    description?: string;
  }
) {
  return supabase.from("holidays").insert({
    tenant_id: params.tenantId,
    name: params.name.trim(),
    date: params.date,
    type: params.type,
    description: params.description?.trim() || null,
  });
}

export async function updateHoliday(
  supabase: SupabaseClient,
  params: {
    id: string;
    tenantId: string;
    name: string;
    date: string;
    type: string;
    description?: string;
  }
) {
  return supabase
    .from("holidays")
    .update({
      name: params.name.trim(),
      date: params.date,
      type: params.type,
      description: params.description?.trim() || null,
    })
    .eq("id", params.id)
    .eq("tenant_id", params.tenantId);
}

export async function deleteHoliday(
  supabase: SupabaseClient,
  tenantId: string,
  holidayId: string
) {
  return supabase
    .from("holidays")
    .delete()
    .eq("id", holidayId)
    .eq("tenant_id", tenantId);
}

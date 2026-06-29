import type { SupabaseClient } from "@supabase/supabase-js";

export type LeaveTypeRow = {
  id: string;
  name: string;
  code: string;
  days_per_year: number;
  is_active: boolean;
};

export type LeaveRequestRow = {
  id: string;
  user_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  leave_types?: { name: string; code: string } | null;
  profiles?: { full_name: string } | null;
};

export async function listActiveLeaveTypes(
  supabase: SupabaseClient,
  tenantId: string
) {
  return supabase
    .from("leave_types")
    .select("id, name, code, days_per_year, is_active")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("code");
}

export async function sumApprovedDaysForYear(
  supabase: SupabaseClient,
  params: { tenantId: string; userId: string; leaveTypeId: string; year: number }
) {
  return supabase
    .from("leave_requests")
    .select("total_days")
    .eq("tenant_id", params.tenantId)
    .eq("user_id", params.userId)
    .eq("leave_type_id", params.leaveTypeId)
    .eq("status", "approved")
    .gte("start_date", `${params.year}-01-01`)
    .lte("start_date", `${params.year}-12-31`);
}

export async function listLeaveRequestsForUser(
  supabase: SupabaseClient,
  params: { tenantId: string; userId: string; year: number }
) {
  return supabase
    .from("leave_requests")
    .select(
      "id, user_id, leave_type_id, start_date, end_date, total_days, reason, status, reviewed_by, reviewed_at, review_note, created_at, leave_types(name, code)"
    )
    .eq("tenant_id", params.tenantId)
    .eq("user_id", params.userId)
    .gte("start_date", `${params.year}-01-01`)
    .lte("start_date", `${params.year}-12-31`)
    .order("created_at", { ascending: false });
}

export async function listPendingLeaveRequests(
  supabase: SupabaseClient,
  tenantId: string
) {
  return supabase
    .from("leave_requests")
    .select(
      "id, user_id, leave_type_id, start_date, end_date, total_days, reason, status, created_at, leave_types(name, code), profiles(full_name)"
    )
    .eq("tenant_id", tenantId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
}

export async function createLeaveRequest(
  supabase: SupabaseClient,
  params: {
    tenantId: string;
    userId: string;
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    reason?: string;
  }
) {
  return supabase.from("leave_requests").insert({
    tenant_id: params.tenantId,
    user_id: params.userId,
    leave_type_id: params.leaveTypeId,
    start_date: params.startDate,
    end_date: params.endDate,
    total_days: params.totalDays,
    reason: params.reason?.trim() || null,
    status: "pending",
  });
}

export async function cancelLeaveRequest(
  supabase: SupabaseClient,
  params: { tenantId: string; userId: string; requestId: string }
) {
  return supabase
    .from("leave_requests")
    .update({ status: "cancelled" })
    .eq("id", params.requestId)
    .eq("tenant_id", params.tenantId)
    .eq("user_id", params.userId)
    .eq("status", "pending")
    .select("id");
}

export async function reviewLeaveRequest(
  supabase: SupabaseClient,
  params: {
    tenantId: string;
    requestId: string;
    status: "approved" | "rejected";
    reviewedBy: string;
    reviewNote?: string;
  }
) {
  return supabase
    .from("leave_requests")
    .update({
      status: params.status,
      reviewed_by: params.reviewedBy,
      reviewed_at: new Date().toISOString(),
      review_note: params.reviewNote?.trim() || null,
    })
    .eq("id", params.requestId)
    .eq("tenant_id", params.tenantId)
    .eq("status", "pending");
}

export async function findOverlappingRequests(
  supabase: SupabaseClient,
  params: {
    tenantId: string;
    userId: string;
    startDate: string;
    endDate: string;
    excludeId?: string;
  }
) {
  let query = supabase
    .from("leave_requests")
    .select("id, start_date, end_date, status")
    .eq("tenant_id", params.tenantId)
    .eq("user_id", params.userId)
    .in("status", ["pending", "approved"])
    .lte("start_date", params.endDate)
    .gte("end_date", params.startDate);

  if (params.excludeId) query = query.neq("id", params.excludeId);
  return query;
}

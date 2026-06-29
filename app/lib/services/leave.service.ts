import type { SupabaseClient } from "@supabase/supabase-js";
import {
  listActiveLeaveTypes,
  sumApprovedDaysForYear,
  listLeaveRequestsForUser,
  listPendingLeaveRequests,
  findOverlappingRequests,
  type LeaveTypeRow,
} from "~/lib/repositories/leave.repository";

export function countInclusiveDays(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (end < start) throw new Error("End date must be on or after start date.");
  return Math.floor((end - start) / 86_400_000) + 1;
}

export function computeBalance(entitled: number, used: number) {
  const remaining = Math.max(0, entitled - used);
  return { entitled, used, remaining };
}

export async function loadLeaveBalances(
  supabase: SupabaseClient,
  params: { tenantId: string; userId: string; year: number }
) {
  const { data: types } = await listActiveLeaveTypes(supabase, params.tenantId);
  const rows = (types ?? []) as LeaveTypeRow[];

  const balances = await Promise.all(
    rows.map(async (type) => {
      const { data: usageRows } = await sumApprovedDaysForYear(supabase, {
        tenantId: params.tenantId,
        userId: params.userId,
        leaveTypeId: type.id,
        year: params.year,
      });
      const used = (usageRows ?? []).reduce((sum, r) => sum + Number(r.total_days), 0);
      return {
        ...type,
        ...computeBalance(type.days_per_year, used),
      };
    })
  );

  return balances;
}

export async function loadLeavePageData(
  supabase: SupabaseClient,
  params: { tenantId: string; userId: string; year: number; isHR: boolean }
) {
  const [balances, requestsRes, pendingRes] = await Promise.all([
    loadLeaveBalances(supabase, params),
    listLeaveRequestsForUser(supabase, params),
    params.isHR
      ? listPendingLeaveRequests(supabase, params.tenantId)
      : Promise.resolve({ data: [] }),
  ]);

  return {
    balances,
    requests: requestsRes.data ?? [],
    pendingQueue: pendingRes.data ?? [],
  };
}

export async function validateNewLeaveRequest(
  supabase: SupabaseClient,
  params: {
    tenantId: string;
    userId: string;
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    year: number;
  }
): Promise<{ totalDays: number } | { error: string }> {
  const totalDays = countInclusiveDays(params.startDate, params.endDate);

  const balances = await loadLeaveBalances(supabase, {
    tenantId: params.tenantId,
    userId: params.userId,
    year: params.year,
  });
  const typeBalance = balances.find((b) => b.id === params.leaveTypeId);
  if (!typeBalance) return { error: "Invalid leave type." };
  if (totalDays > typeBalance.remaining) {
    return {
      error: `Insufficient balance. ${typeBalance.remaining} day(s) remaining for ${typeBalance.code}.`,
    };
  }

  const { data: overlaps } = await findOverlappingRequests(supabase, {
    tenantId: params.tenantId,
    userId: params.userId,
    startDate: params.startDate,
    endDate: params.endDate,
  });
  if ((overlaps ?? []).length > 0) {
    return { error: "Dates overlap with an existing pending or approved request." };
  }

  return { totalDays };
}

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  listEmployees,
  countProfiles,
  updateProfileStatus,
} from "~/lib/repositories/profiles.repository";
import {
  listPendingInvites,
  countPendingInvites,
} from "~/lib/repositories/invites.repository";

export async function loadEmployeeDirectory(supabase: SupabaseClient, tenantId: string) {
  const [employeesRes, countRes, invitesRes, pendingInviteCountRes] = await Promise.all([
    listEmployees(supabase, tenantId),
    countProfiles(supabase, tenantId),
    listPendingInvites(supabase, tenantId),
    countPendingInvites(supabase, tenantId),
  ]);

  return {
    employees: employeesRes.data ?? [],
    totalCount: countRes.count ?? 0,
    pendingInvites: invitesRes.data ?? [],
    pendingInviteCount: pendingInviteCountRes.count ?? 0,
  };
}

export async function setEmployeeStatus(
  supabase: SupabaseClient,
  params: { userId: string; tenantId: string; status: "active" | "inactive" }
) {
  const { error } = await updateProfileStatus(supabase, params);
  if (error) return { error: error.message };
  return { success: true as const };
}

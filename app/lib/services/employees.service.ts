import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServiceClient } from "~/lib/supabase.server";
import {
  listEmployees,
  countProfiles,
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
  env: Env,
  params: { userId: string; tenantId: string; status: "active" | "inactive" }
) {
  const service = createSupabaseServiceClient(env);
  const { error } = await service
    .from("profiles")
    .update({ status: params.status })
    .eq("id", params.userId)
    .eq("tenant_id", params.tenantId);

  if (error) return { error: error.message };
  return { success: true as const };
}

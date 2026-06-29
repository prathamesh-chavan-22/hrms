import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile, Tenant } from "~/types/app";
import { todayIST } from "~/lib/dates";
import { loadLeaveBalances } from "~/lib/services/leave.service";

export type ChatHandlerContext = {
  supabase: SupabaseClient;
  profile: Profile;
  tenant: Tenant;
};

export type ChatQueryHandler = (ctx: ChatHandlerContext) => Promise<string>;

export const leaveBalanceHandler: ChatQueryHandler = async ({ supabase, profile, tenant }) => {
  const year = new Date().getFullYear();
  const balances = await loadLeaveBalances(supabase, {
    tenantId: tenant.id,
    userId: profile.id,
    year,
  });
  const list = balances
    .filter((b) => b.days_per_year > 0)
    .map((b) => `${b.code}: ${b.remaining}/${b.entitled} remaining`)
    .join(", ");
  return list ? `Your leave balance: ${list}.` : "No leave types configured yet.";
};

export const holidaysHandler: ChatQueryHandler = async ({ supabase, tenant }) => {
  const { data: holidays } = await supabase
    .from("holidays")
    .select("name, date")
    .eq("tenant_id", tenant.id)
    .gte("date", todayIST())
    .order("date")
    .limit(5);
  const list = (holidays ?? [])
    .map((h) => `${h.name} on ${new Date(h.date).toLocaleDateString("en-IN")}`)
    .join("; ");
  return `Upcoming holidays: ${list || "None scheduled."}`;
};

export const attendanceTodayHandler: ChatQueryHandler = async ({ supabase, profile, tenant }) => {
  const today = todayIST();
  const { data: att } = await supabase
    .from("attendance")
    .select("punch_in_at, punch_out_at")
    .eq("tenant_id", tenant.id)
    .eq("user_id", profile.id)
    .eq("date", today)
    .single();

  if (!att) return "You haven't punched in today.";

  const inTime = att.punch_in_at ? new Date(att.punch_in_at).toLocaleTimeString("en-IN") : "—";
  const outTime = att.punch_out_at ? new Date(att.punch_out_at).toLocaleTimeString("en-IN") : "not yet";
  return `Today: Punch in ${inTime}, Punch out ${outTime}.`;
};

export const chatQueryHandlers: Record<string, ChatQueryHandler> = {
  leave_balance: leaveBalanceHandler,
  holidays: holidaysHandler,
  attendance_today: attendanceTodayHandler,
};

export async function resolveChatReply(
  queryType: string | null,
  staticResponse: string,
  ctx: ChatHandlerContext
): Promise<string> {
  if (!queryType) return staticResponse;
  const handler = chatQueryHandlers[queryType];
  if (!handler) return staticResponse;
  return handler(ctx);
}

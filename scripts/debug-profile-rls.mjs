/**
 * Debug script: verify whether HR+ can escalate privileges via direct profiles UPDATE.
 * Logs results to the debug ingest endpoint for hypothesis validation.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const LOG_ENDPOINT =
  "http://127.0.0.1:7468/ingest/87e859e7-e90d-405f-9d7b-f36f2924a713";
const SESSION_ID = "57af13";

function loadEnv() {
  const vars = Object.fromEntries(
    readFileSync(resolve(".dev.vars"), "utf8")
      .split("\n")
      .filter((l) => l && !l.startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i), l.slice(i + 1)];
      })
  );
  return vars;
}

async function log(hypothesisId, message, data) {
  const payload = {
    sessionId: SESSION_ID,
    runId: process.env.DEBUG_RUN_ID ?? "pre-fix",
    hypothesisId,
    location: "scripts/debug-profile-rls.mjs",
    message,
    data,
    timestamp: Date.now(),
  };
  await fetch(LOG_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": SESSION_ID,
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
  console.log(JSON.stringify(payload));
}

const env = loadEnv();
const service = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: privilegedProfiles, error: hrListError } = await service
  .from("profiles")
  .select("id, email, role, tenant_id")
  .in("role", ["hr", "admin", "owner"])
  .limit(1);

if (hrListError || !privilegedProfiles?.length) {
  await log("A", "no_privileged_user_found", {
    error: hrListError?.message ?? "empty",
  });
  process.exit(1);
}

const hr = privilegedProfiles[0];

let target = null;
let createdTarget = false;
const { data: existingTargets } = await service
  .from("profiles")
  .select("id, email, role, status, tenant_id")
  .eq("tenant_id", hr.tenant_id)
  .neq("id", hr.id)
  .limit(1);

if (existingTargets?.length) {
  target = existingTargets[0];
} else {
  const tempEmail = `debug-target-${Date.now()}@example.com`;
  const tempPassword = `Dbg!${Date.now().toString(36)}`;
  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email: tempEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: "Debug Target" },
  });
  if (authError || !authData.user) {
    await log("A", "create_target_user_failed", { error: authError?.message ?? "no user" });
    process.exit(1);
  }
  const { error: profileError } = await service.from("profiles").insert({
    id: authData.user.id,
    tenant_id: hr.tenant_id,
    role: "employee",
    full_name: "Debug Target",
    email: tempEmail,
    status: "active",
  });
  if (profileError) {
    await log("A", "create_target_profile_failed", { error: profileError.message });
    process.exit(1);
  }
  target = {
    id: authData.user.id,
    email: tempEmail,
    role: "employee",
    status: "active",
    tenant_id: hr.tenant_id,
  };
  createdTarget = true;
}
const originalRole = target.role;
const originalStatus = target.status;

await log("A", "test_context", {
  hrId: hr.id,
  hrRole: hr.role,
  targetId: target.id,
  targetRole: originalRole,
  targetStatus: originalStatus,
});

const tempPassword = `Dbg!${Date.now().toString(36)}`;
const { error: pwError } = await service.auth.admin.updateUserById(hr.id, {
  password: tempPassword,
});
if (pwError) {
  await log("B", "set_temp_password_failed", { error: pwError.message });
  process.exit(1);
}

const hrClient = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: signInData, error: signInError } =
  await hrClient.auth.signInWithPassword({
    email: hr.email,
    password: tempPassword,
  });

if (signInError) {
  await log("B", "hr_sign_in_failed", { error: signInError.message });
  process.exit(1);
}

await log("B", "hr_signed_in", {
  userId: signInData.user?.id,
  sessionRole: signInData.user?.id === hr.id,
});

const { data: roleUpdateData, error: roleUpdateError } = await hrClient
  .from("profiles")
  .update({ role: "owner" })
  .eq("id", target.id)
  .select("id, role")
  .maybeSingle();

const { data: afterRoleRow } = await service
  .from("profiles")
  .select("id, role")
  .eq("id", target.id)
  .single();

await log("A", "role_escalation_attempt", {
  updateError: roleUpdateError?.message ?? null,
  returnedRole: roleUpdateData?.role ?? null,
  persistedRole: afterRoleRow?.role ?? null,
  escalationSucceeded: afterRoleRow?.role === "owner",
});

const { data: statusUpdateData, error: statusUpdateError } = await hrClient
  .from("profiles")
  .update({ status: "inactive" })
  .eq("id", target.id)
  .select("id, status")
  .maybeSingle();

const { data: afterStatusRow } = await service
  .from("profiles")
  .select("id, status")
  .eq("id", target.id)
  .single();

await log("C", "status_change_attempt", {
  updateError: statusUpdateError?.message ?? null,
  returnedStatus: statusUpdateData?.status ?? null,
  persistedStatus: afterStatusRow?.status ?? null,
  changeSucceeded: afterStatusRow?.status === "inactive",
});

await service
  .from("profiles")
  .update({ role: originalRole, status: originalStatus })
  .eq("id", target.id);

if (createdTarget) {
  await service.auth.admin.deleteUser(target.id);
}

await log("D", "hr_manage_policy_allows_update", {
  roleUpdateAllowed: !roleUpdateError,
  statusUpdateAllowed: !statusUpdateError,
});

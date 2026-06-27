import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Database } from "~/types/database";

// Load environment variables from .dev.vars
let supabaseUrl = process.env.SUPABASE_URL;
let supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  try {
    const envPath = resolve(".dev.vars");
    const envContent = readFileSync(envPath, "utf8");
    envContent.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const index = trimmed.indexOf("=");
        if (index !== -1) {
          const key = trimmed.slice(0, index).trim();
          const value = trimmed.slice(index + 1).trim();
          if (key === "SUPABASE_URL") supabaseUrl = value;
          if (key === "SUPABASE_SECRET_KEY") supabaseSecretKey = value;
        }
      }
    });
  } catch (e) {
    console.warn("Could not load environment variables from .dev.vars in test helper:", e);
  }
}

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set in process.env or .dev.vars");
}

export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export interface TestTenantInfo {
  tenantId: string;
  slug: string;
  name: string;
  ownerEmail: string;
  ownerName: string;
  ownerPassword: string;
  ownerId: string;
}

export async function createTestTenantAndOwner(suffix: string): Promise<TestTenantInfo> {
  const slug = `test-slug-${suffix}`;
  const name = `Test Company ${suffix}`;
  const ownerEmail = `owner-${suffix}@example.com`;
  const ownerName = `Test Owner ${suffix}`;
  const ownerPassword = `TestPassword123!`;

  // 1. Create auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: ownerEmail,
    password: ownerPassword,
    email_confirm: true,
    user_metadata: { full_name: ownerName },
  });

  if (authError || !authData.user) {
    throw new Error(`Failed to create test auth user: ${authError?.message}`);
  }

  const ownerId = authData.user.id;

  // 2. Create tenant
  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from("tenants")
    .insert({
      slug,
      name,
    })
    .select()
    .single();

  if (tenantError || !tenant) {
    await supabaseAdmin.auth.admin.deleteUser(ownerId);
    throw new Error(`Failed to create test tenant: ${tenantError?.message}`);
  }

  // 3. Create profile
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .insert({
      id: ownerId,
      tenant_id: tenant.id,
      role: "owner",
      full_name: ownerName,
      email: ownerEmail,
      status: "active",
    });

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(ownerId);
    await supabaseAdmin.from("tenants").delete().eq("id", tenant.id);
    throw new Error(`Failed to create test owner profile: ${profileError.message}`);
  }

  // 4. Seed tenant defaults
  const { error: seedError } = await supabaseAdmin.rpc("seed_tenant_defaults", {
    p_tenant_id: tenant.id,
  });

  if (seedError) {
    console.warn(`Warning: failed to seed defaults for test tenant: ${seedError.message}`);
  }

  return {
    tenantId: tenant.id,
    slug,
    name,
    ownerEmail,
    ownerName,
    ownerPassword,
    ownerId,
  };
}

export async function createTestEmployee(
  tenantId: string,
  suffix: string,
  role: "employee" | "hr" | "admin" = "employee"
) {
  const email = `emp-${suffix}@example.com`;
  const name = `Test Employee ${suffix}`;
  const password = `TestPassword123!`;

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });

  if (authError || !authData.user) {
    throw new Error(`Failed to create test employee user: ${authError?.message}`);
  }

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .insert({
      id: authData.user.id,
      tenant_id: tenantId,
      role,
      full_name: name,
      email,
      status: "active",
    });

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    throw new Error(`Failed to create test employee profile: ${profileError.message}`);
  }

  return {
    id: authData.user.id,
    email,
    name,
    password,
  };
}

export async function cleanUpTestTenant(tenantId: string) {
  // Find all profiles in the tenant
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("tenant_id", tenantId);

  if (profiles && profiles.length > 0) {
    for (const profile of profiles) {
      await supabaseAdmin.auth.admin.deleteUser(profile.id);
    }
  }

  // Delete tenant (cascades database-wise to other tables)
  const { error: deleteErr } = await supabaseAdmin.from("tenants").delete().eq("id", tenantId);
  if (deleteErr) {
    console.error(`Failed to delete tenant ${tenantId}:`, deleteErr.message);
  }
}

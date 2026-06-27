import { test, expect } from "@playwright/test";
import { supabaseAdmin, createTestTenantAndOwner, createTestEmployee } from "./helpers";

test("Delete owner user cascades to delete the tenant and all other profiles", async () => {
  const suffix = Math.random().toString(36).substring(2, 7);

  // 1. Create a test tenant and owner
  const tenant = await createTestTenantAndOwner(suffix);

  // 2. Create a test employee
  const employee = await createTestEmployee(tenant.tenantId, suffix);

  // 3. Verify they all exist
  const { data: tenantBefore } = await supabaseAdmin
    .from("tenants")
    .select("id")
    .eq("id", tenant.tenantId)
    .single();
  expect(tenantBefore).not.toBeNull();
  expect(tenantBefore?.id).toBe(tenant.tenantId);

  const { data: employeeBefore } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", employee.id)
    .single();
  expect(employeeBefore).not.toBeNull();
  expect(employeeBefore?.id).toBe(employee.id);

  // 4. Delete the owner user
  const { error: deleteOwnerErr } = await supabaseAdmin.auth.admin.deleteUser(tenant.ownerId);
  expect(deleteOwnerErr).toBeNull();

  // 5. Verify the tenant is deleted (cascaded)
  const { data: tenantAfter } = await supabaseAdmin
    .from("tenants")
    .select("id")
    .eq("id", tenant.tenantId);
  expect(tenantAfter).toHaveLength(0);

  // 6. Verify that the employee profile is also deleted (cascaded from tenant)
  const { data: employeeAfter } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", employee.id);
  expect(employeeAfter).toHaveLength(0);

  // 7. Clean up the employee's auth user (since deleting profile doesn't delete auth.users row)
  await supabaseAdmin.auth.admin.deleteUser(employee.id);
});

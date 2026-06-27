# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cascade.spec.ts >> Delete owner user cascades to delete the tenant and all other profiles
- Location: tests\e2e\cascade.spec.ts:4:1

# Error details

```
Error: expect(received).toHaveLength(expected)

Expected length: 0
Received length: 1
Received array:  [{"id": "03a29daf-71a8-4aeb-ad1a-79e6e51cfeca"}]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { supabaseAdmin, createTestTenantAndOwner, createTestEmployee } from "./helpers";
  3  | 
  4  | test("Delete owner user cascades to delete the tenant and all other profiles", async () => {
  5  |   const suffix = Math.random().toString(36).substring(2, 7);
  6  | 
  7  |   // 1. Create a test tenant and owner
  8  |   const tenant = await createTestTenantAndOwner(suffix);
  9  | 
  10 |   // 2. Create a test employee
  11 |   const employee = await createTestEmployee(tenant.tenantId, suffix);
  12 | 
  13 |   // 3. Verify they all exist
  14 |   const { data: tenantBefore } = await supabaseAdmin
  15 |     .from("tenants")
  16 |     .select("id")
  17 |     .eq("id", tenant.tenantId)
  18 |     .single();
  19 |   expect(tenantBefore).not.toBeNull();
  20 |   expect(tenantBefore?.id).toBe(tenant.tenantId);
  21 | 
  22 |   const { data: employeeBefore } = await supabaseAdmin
  23 |     .from("profiles")
  24 |     .select("id")
  25 |     .eq("id", employee.id)
  26 |     .single();
  27 |   expect(employeeBefore).not.toBeNull();
  28 |   expect(employeeBefore?.id).toBe(employee.id);
  29 | 
  30 |   // 4. Delete the owner user
  31 |   const { error: deleteOwnerErr } = await supabaseAdmin.auth.admin.deleteUser(tenant.ownerId);
  32 |   expect(deleteOwnerErr).toBeNull();
  33 | 
  34 |   // 5. Verify the tenant is deleted (cascaded)
  35 |   const { data: tenantAfter } = await supabaseAdmin
  36 |     .from("tenants")
  37 |     .select("id")
  38 |     .eq("id", tenant.tenantId);
> 39 |   expect(tenantAfter).toHaveLength(0);
     |                       ^ Error: expect(received).toHaveLength(expected)
  40 | 
  41 |   // 6. Verify that the employee profile is also deleted (cascaded from tenant)
  42 |   const { data: employeeAfter } = await supabaseAdmin
  43 |     .from("profiles")
  44 |     .select("id")
  45 |     .eq("id", employee.id);
  46 |   expect(employeeAfter).toHaveLength(0);
  47 | 
  48 |   // 7. Clean up the employee's auth user (since deleting profile doesn't delete auth.users row)
  49 |   await supabaseAdmin.auth.admin.deleteUser(employee.id);
  50 | });
  51 | 
```
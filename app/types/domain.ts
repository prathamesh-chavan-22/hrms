import type { Database } from "./database";

/** Domain row types derived from Supabase schema. */
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type TenantRow = Database["public"]["Tables"]["tenants"]["Row"];
export type InviteRow = Database["public"]["Tables"]["invites"]["Row"];
export type CompanyRequestRow = Database["public"]["Tables"]["company_requests"]["Row"];

/** Profile with joined tenant — common loader shape. */
export type ProfileWithTenant = ProfileRow & {
  tenant: TenantRow;
};

/** Partial profile fields used by child loaders. */
export type ProfileScope = Pick<ProfileRow, "id" | "role" | "tenant_id">;

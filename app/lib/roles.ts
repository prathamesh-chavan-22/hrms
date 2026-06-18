import type { UserRole } from "~/types/app";

export function isHR(role: string): boolean {
  return ["owner", "hr", "admin"].includes(role);
}

export function isOwner(role: string): boolean {
  return role === "owner";
}

type InvitableRole = Exclude<UserRole, "owner">;

const INVITE_ROLE_LABELS: Record<InvitableRole, string> = {
  employee: "Employee",
  hr: "HR",
  admin: "Admin",
};

/** Roles an inviter may assign. Owner is never invitable. */
export function getInvitableRoles(inviterRole: UserRole): InvitableRole[] {
  if (inviterRole === "owner") return ["employee", "hr", "admin"];
  return ["employee"];
}

export function isInvitableRole(role: string, inviterRole: UserRole): role is InvitableRole {
  return getInvitableRoles(inviterRole).includes(role as InvitableRole);
}

export function inviteRoleOptions(inviterRole: UserRole) {
  return getInvitableRoles(inviterRole).map((value) => ({
    value,
    label: INVITE_ROLE_LABELS[value],
  }));
}

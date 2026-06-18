/** Compatibility barrel — import from ~/lib/auth.server or specific auth modules. */
export { SLUG_REGEX, isValidSlug } from "./auth/constants";
export {
  isSuperAdminEmail,
  isActiveProfile,
  getSuperAdminRedirect,
  generateTempPassword,
  getLoginRedirect,
} from "./auth/helpers";
export {
  getSession,
  requireUser,
  requireProfile,
  resolveRedirectAfterLogin,
} from "./auth/session.server";
export {
  requireSuperAdmin,
  requireTenantAccess,
  requireHR,
  requireChildLoaderAuth,
} from "./auth/guards.server";
export { createTenantWithOwner } from "./auth/tenant.server";
export {
  validateCompanyRequest,
  submitCompanyRequest,
  approveCompanyRequest,
  rejectCompanyRequest,
} from "./auth/company-requests.server";
export {
  createInvite,
  resendInvite,
  revokeInvite,
  getInviteByToken,
  acceptInvite,
} from "./auth/invites.server";
export {
  resetEmployeePassword,
  completeFirstLoginPasswordChange,
  submitPasswordResetRequest,
} from "./auth/passwords.server";

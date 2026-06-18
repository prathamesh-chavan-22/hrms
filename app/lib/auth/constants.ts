/** Slug format: 3–32 chars, lowercase alphanumeric and hyphens. */
export const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_REGEX.test(slug);
}

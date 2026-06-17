export function isHR(role: string): boolean {
  return ["owner", "hr", "admin"].includes(role);
}

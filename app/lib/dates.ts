/**
 * Returns the current calendar date in IST (Asia/Kolkata) as YYYY-MM-DD.
 * Uses Intl.DateTimeFormat so it handles DST and is safe on Cloudflare Workers.
 */
export function todayIST(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Structured server-side logging for fire-and-forget operations. */
export function logServerError(context: string, message: string, error?: unknown) {
  console.error(`[${context}] ${message}`, error ?? "");
}

export function logEmailFailure(
  emailType: string,
  error: unknown,
  meta?: Record<string, string>
) {
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  console.error(`[Email:${emailType}] Send failed${metaStr}`, error);
}

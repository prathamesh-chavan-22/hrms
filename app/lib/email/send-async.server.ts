import { logEmailFailure } from "~/lib/logging.server";

/** Fire-and-forget email send with structured error logging. */
export function fireAndForgetEmail(
  promise: Promise<{ error?: string; success?: boolean }>,
  emailType: string,
  meta?: Record<string, string>,
  waitUntil?: (promise: Promise<any>) => void
) {
  const wrappedPromise = promise.catch((err) => {
    logEmailFailure(emailType, err, meta);
    return { error: String(err) };
  });

  if (waitUntil) {
    try {
      waitUntil(wrappedPromise);
    } catch (e) {
      console.warn("fireAndForgetEmail: failed to call waitUntil:", e);
    }
  }
}

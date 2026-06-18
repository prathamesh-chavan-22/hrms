import { logEmailFailure } from "~/lib/logging.server";

/** Fire-and-forget email send with structured error logging. */
export function fireAndForgetEmail(
  promise: Promise<{ error?: string; success?: boolean }>,
  emailType: string,
  meta?: Record<string, string>
) {
  promise.catch((err) => logEmailFailure(emailType, err, meta));
}

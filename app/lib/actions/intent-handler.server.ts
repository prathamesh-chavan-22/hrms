import type { ActionResult } from "./action-result";
import { actionError } from "./action-result";

export type IntentHandlerContext = {
  request: Request;
  form: FormData;
  env: Env;
  params: Record<string, string | undefined>;
};

export type IntentHandler = (
  ctx: IntentHandlerContext
) => Promise<Response | ActionResult>;

export async function dispatchIntent(
  intent: string,
  handlers: Record<string, IntentHandler>,
  ctx: IntentHandlerContext
): Promise<Response> {
  const handler = handlers[intent];
  if (!handler) {
    return actionError("Unknown action", intent, 400) as Response;
  }
  const result = await handler(ctx);
  if (result instanceof Response) return result;
  const { data } = await import("react-router");
  return data(result) as Response;
}

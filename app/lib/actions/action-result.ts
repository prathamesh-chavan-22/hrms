import { data, redirect } from "react-router";

export type ActionResult = {
  success: string | null;
  error: string | null;
  intent: string;
  logoUrl?: string | null;
};

export function actionSuccess(
  message: string,
  intent: string,
  extra?: Partial<Pick<ActionResult, "logoUrl">>
) {
  return data({ success: message, error: null, intent, logoUrl: extra?.logoUrl ?? null });
}

export function actionError(
  message: string,
  intent: string,
  status = 400,
  extra?: Partial<Pick<ActionResult, "logoUrl">>
) {
  return data(
    { error: message, success: null, intent, logoUrl: extra?.logoUrl ?? null },
    { status }
  );
}

export function actionRedirect(path: string): ReturnType<typeof redirect> {
  return redirect(path);
}

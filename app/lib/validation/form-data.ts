/** Typed FormData field extraction helpers. */
export function getString(form: FormData, key: string, fallback = ""): string {
  return String(form.get(key) ?? fallback);
}

export function getTrimmedString(form: FormData, key: string, fallback = ""): string {
  return getString(form, key, fallback).trim();
}

export function getLowercaseEmail(form: FormData, key: string): string {
  return getTrimmedString(form, key).toLowerCase();
}

export function getIntent(form: FormData): string {
  return getString(form, "intent");
}

export function getOptionalFloat(form: FormData, key: string): number | null {
  const raw = parseFloat(getString(form, key));
  return Number.isFinite(raw) ? raw : null;
}

export function getBooleanFlag(form: FormData, key: string): boolean {
  return form.get(key) === "true";
}

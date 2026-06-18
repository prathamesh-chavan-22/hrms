export const MIN_PASSWORD_LENGTH = 8;

export function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return null;
}

export function validatePasswordConfirmation(
  password: string,
  confirmPassword: string
): string | null {
  const passwordError = validatePassword(password);
  if (passwordError) return passwordError;
  if (password !== confirmPassword) return "Passwords do not match";
  return null;
}

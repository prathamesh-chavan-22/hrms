interface FlashMessageProps {
  message: string | null | undefined;
  variant: "success" | "error" | "warn";
}

const STYLES: Record<FlashMessageProps["variant"], { border: string; text: string }> = {
  success: { border: "var(--ok)", text: "var(--ok)" },
  error: { border: "var(--err)", text: "var(--err)" },
  warn: { border: "var(--warn)", text: "var(--warn)" },
};

export function FlashMessage({ message, variant }: FlashMessageProps) {
  if (!message) return null;
  const { border, text } = STYLES[variant];
  return (
    <div
      className="bevel-sunken px-4 py-2.5 border-l-4 text-sm font-mono"
      style={{ borderLeftColor: border, color: text }}
    >
      {message}
    </div>
  );
}

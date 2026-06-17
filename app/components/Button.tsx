import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
}

const variants = {
  primary: "bevel-accent bevel-press",
  secondary: "bevel bevel-press text-ink",
  danger: "bevel-press border-2 border-rule text-bg",
  ghost: "border-2 border-transparent text-ink-2 hover:border-rule hover:bg-surface",
};

const sizes = {
  sm: "px-3 py-1.5 text-[11px]",
  md: "px-5 py-2.5 text-xs",
  lg: "px-7 py-3 text-sm",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  className = "",
  disabled,
  style,
  ...props
}: ButtonProps) {
  const dangerStyle =
    variant === "danger" ? { backgroundColor: "var(--err)", ...style } : style;

  return (
    <button
      {...props}
      style={dangerStyle}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2
        font-mono font-bold uppercase tracking-[0.08em]
        transition-transform duration-75
        disabled:opacity-45 disabled:cursor-not-allowed
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
    >
      {loading && (
        <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent animate-spin" />
      )}
      {children}
    </button>
  );
}

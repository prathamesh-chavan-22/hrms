interface BadgeProps {
  children: React.ReactNode;
  variant?: "sky" | "green" | "yellow" | "red" | "slate" | "purple";
  size?: "sm" | "md";
}

const variants = {
  sky: "bg-accent text-[#F4F9FC]",
  green: "text-[#F4F9FC]",
  yellow: "text-[#F4F9FC]",
  red: "text-[#F4F9FC]",
  slate: "bg-surface text-ink-2",
  purple: "bg-ink text-bg",
};

const inlineBg: Record<string, string | undefined> = {
  green: "var(--ok)",
  yellow: "var(--warn)",
  red: "var(--err)",
};

const sizes = {
  sm: "text-[9px] px-1.5 py-0.5",
  md: "text-[10px] px-2 py-0.5",
};

export function Badge({ children, variant = "sky", size = "md" }: BadgeProps) {
  return (
    <span
      style={inlineBg[variant] ? { backgroundColor: inlineBg[variant] } : undefined}
      className={`chip ${variants[variant]} ${sizes[size]}`}
    >
      {children}
    </span>
  );
}

export function roleBadge(role: string) {
  const map: Record<string, BadgeProps["variant"]> = {
    owner: "purple",
    hr: "sky",
    admin: "sky",
    employee: "slate",
  };
  return { variant: map[role] ?? "slate" };
}

export function statusBadge(status: string) {
  const map: Record<string, BadgeProps["variant"]> = {
    active: "green",
    inactive: "slate",
    invited: "yellow",
    pending: "yellow",
    approved: "green",
    rejected: "red",
    cancelled: "slate",
  };
  return { variant: map[status] ?? "slate" };
}

interface BadgeProps {
  children: React.ReactNode;
  variant?: "sky" | "green" | "yellow" | "red" | "slate" | "purple";
  size?: "sm" | "md";
}

const variants = {
  sky: "bg-sky-100 text-sky-700 border border-sky-200",
  green: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  yellow: "bg-amber-100 text-amber-700 border border-amber-200",
  red: "bg-red-100 text-red-700 border border-red-200",
  slate: "bg-slate-100 text-slate-600 border border-slate-200",
  purple: "bg-violet-100 text-violet-700 border border-violet-200",
};

const sizes = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-xs",
};

export function Badge({ children, variant = "sky", size = "md" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${variants[variant]} ${sizes[size]}`}>
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

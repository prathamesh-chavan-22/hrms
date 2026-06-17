interface GlaciaLogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { icon: 20, text: "text-lg" },
  md: { icon: 28, text: "text-2xl" },
  lg: { icon: 40, text: "text-4xl" },
};

export function GlaciaLogo({ className = "", showText = true, size = "md" }: GlaciaLogoProps) {
  const s = sizes[size];
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="glaciaGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#7dd3fc" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
        </defs>
        {/* Snowflake-crystal icon */}
        <circle cx="20" cy="20" r="18" fill="url(#glaciaGrad)" opacity="0.15" />
        <line x1="20" y1="4" x2="20" y2="36" stroke="url(#glaciaGrad)" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="4" y1="20" x2="36" y2="20" stroke="url(#glaciaGrad)" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="7.7" y1="7.7" x2="32.3" y2="32.3" stroke="url(#glaciaGrad)" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="32.3" y1="7.7" x2="7.7" y2="32.3" stroke="url(#glaciaGrad)" strokeWidth="2.5" strokeLinecap="round" />
        {/* center gem */}
        <circle cx="20" cy="20" r="4" fill="#0ea5e9" />
        <circle cx="20" cy="20" r="2" fill="#e0f2fe" />
        {/* branch tips */}
        {[
          [20, 4], [20, 36], [4, 20], [36, 20],
          [7.7, 7.7], [32.3, 32.3], [32.3, 7.7], [7.7, 32.3],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="2.5" fill="#38bdf8" />
        ))}
      </svg>
      {showText && (
        <span className={`font-extrabold tracking-tight bg-gradient-to-r from-sky-400 to-cyan-600 bg-clip-text text-transparent ${s.text}`}>
          Glacia
        </span>
      )}
    </span>
  );
}

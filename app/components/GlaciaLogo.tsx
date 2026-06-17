interface GlaciaLogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { box: "w-7 h-7", glyph: 16, text: "text-base" },
  md: { box: "w-9 h-9", glyph: 20, text: "text-xl" },
  lg: { box: "w-12 h-12", glyph: 26, text: "text-3xl" },
};

export function GlaciaLogo({ className = "", showText = true, size = "md" }: GlaciaLogoProps) {
  const s = sizes[size];
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        className={`bevel-accent ${s.box} inline-flex items-center justify-center flex-shrink-0`}
        aria-hidden="true"
      >
        <svg
          width={s.glyph}
          height={s.glyph}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#F4F9FC"
          strokeWidth={2}
          strokeLinecap="square"
        >
          {/* Hard-edged crystal — square, no rounding */}
          <line x1="12" y1="2" x2="12" y2="22" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <line x1="5" y1="5" x2="19" y2="19" />
          <line x1="19" y1="5" x2="5" y2="19" />
          <rect x="9.5" y="9.5" width="5" height="5" fill="#F4F9FC" stroke="none" />
        </svg>
      </span>
      {showText && (
        <span className={`display font-extrabold tracking-tight text-ink ${s.text}`}>
          GLACIA
        </span>
      )}
    </span>
  );
}

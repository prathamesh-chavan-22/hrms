interface IcyCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function IcyCard({ children, className = "", hover = false }: IcyCardProps) {
  return (
    <div
      className={`
        bg-white/60 backdrop-blur-md border border-sky-100 rounded-2xl shadow-[0_4px_24px_rgba(14,165,233,0.08)]
        ${hover ? "transition-all duration-200 hover:shadow-[0_8px_32px_rgba(14,165,233,0.16)] hover:-translate-y-0.5" : ""}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export function IcyCardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`px-6 py-5 border-b border-sky-50 ${className}`}>
      {children}
    </div>
  );
}

export function IcyCardBody({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`px-6 py-5 ${className}`}>
      {children}
    </div>
  );
}

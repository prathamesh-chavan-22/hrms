interface IcyCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function IcyCard({ children, className = "", hover = false }: IcyCardProps) {
  return (
    <div className={`bevel ${hover ? "hard-shadow-sm" : ""} ${className}`}>
      {children}
    </div>
  );
}

export function IcyCardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`panel-header px-5 py-3 ${className}`}>
      {children}
    </div>
  );
}

export function IcyCardBody({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`px-5 py-4 ${className}`}>
      {children}
    </div>
  );
}

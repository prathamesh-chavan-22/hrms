export interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  tag: string;
}

export function StatCard({ label, value, sub, tag }: StatCardProps) {
  return (
    <div className="bevel p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="eyebrow">{label}</p>
        <span className="chip chip-accent">{tag}</span>
      </div>
      <p className="display text-3xl text-ink tnum">{value}</p>
      {sub && <p className="eyebrow mt-1.5">{sub}</p>}
    </div>
  );
}

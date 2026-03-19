type StatCardProps = {
  label: string;
  value: string;
  meta: string;
  tone?: "default" | "accent";
};

export function StatCard({ label, value, meta, tone = "default" }: StatCardProps) {
  return (
    <article className={`stat-card stat-card--${tone}`}>
      <p className="stat-card__label">{label}</p>
      <strong className="stat-card__value">{value}</strong>
      <span className="stat-card__meta">{meta}</span>
    </article>
  );
}

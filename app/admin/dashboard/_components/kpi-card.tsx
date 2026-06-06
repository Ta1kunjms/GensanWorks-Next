type KpiCardProps = {
  label: string;
  value: string;
  trendLabel?: string;
};

export function KpiCard({ label, value, trendLabel }: KpiCardProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-4">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-600">
          {label}
        </p>
        {trendLabel ? (
          <p className="mt-0.5 text-xs text-slate-500">{trendLabel}</p>
        ) : null}
      </div>
      <p className="shrink-0 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

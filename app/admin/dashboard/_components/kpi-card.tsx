import { Card, CardContent } from "@/components/ui/card";

type KpiCardProps = {
  label: string;
  value: string;
  trendLabel?: string;
};

export function KpiCard({ label, value, trendLabel }: KpiCardProps) {
  return (
    <Card className="border-slate-200">
      <CardContent className="space-y-2 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {trendLabel ? <p className="text-xs text-slate-600">{trendLabel}</p> : null}
      </CardContent>
    </Card>
  );
}

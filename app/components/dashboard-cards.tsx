import { Card } from "@/components/ui/card";

type StatValue = string | number;

type DashboardStatCardProps = {
  label: string;
  value: StatValue;
};

type DashboardStatGridProps = {
  items: DashboardStatCardProps[];
  className?: string;
};

export function DashboardStatCard({ label, value }: DashboardStatCardProps) {
  return (
    <Card className="p-4">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </Card>
  );
}

export function DashboardStatGrid({
  items,
  className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",
}: DashboardStatGridProps) {
  return (
    <div className={className}>
      {items.map((item) => (
        <DashboardStatCard key={item.label} label={item.label} value={item.value} />
      ))}
    </div>
  );
}

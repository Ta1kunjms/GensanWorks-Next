import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type RankingListItem = {
  id: string;
  label: string;
  value: number;
  sublabel?: string;
};

type RankingListCardProps = {
  title: string;
  items: RankingListItem[];
};

export function RankingListCard({ title, items }: RankingListCardProps) {
  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-slate-900">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">No records available.</p>
        ) : (
          <ol className="space-y-3">
            {items.map((item, index) => (
              <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {index + 1}. {item.label}
                  </p>
                  {item.sublabel ? <p className="text-xs text-slate-500">{item.sublabel}</p> : null}
                </div>
                <span className="text-sm font-bold text-slate-900">{item.value}</span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

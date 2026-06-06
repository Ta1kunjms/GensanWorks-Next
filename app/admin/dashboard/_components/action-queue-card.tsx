import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";

type ActionQueueCardProps = {
  title: string;
  count: number;
  ctaLabel: string;
  ctaHref: string;
  priorityLabel: string;
  priorityClassName: string;
};

export function ActionQueueCard({
  title,
  count,
  ctaLabel,
  ctaHref,
  priorityLabel,
  priorityClassName,
}: ActionQueueCardProps) {
  return (
    <Card className="border-slate-200">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <StatusBadge label={priorityLabel} className={priorityClassName} />
        </div>
        <p className="text-3xl font-bold leading-none text-slate-900">{count}</p>
        <Button asChild size="sm" className="w-full bg-slate-900 hover:bg-slate-800">
          <Link href={ctaHref}>{ctaLabel}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

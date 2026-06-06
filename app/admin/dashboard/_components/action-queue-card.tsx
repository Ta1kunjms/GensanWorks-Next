import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ActionQueueCardProps = {
  title: string;
  count: number;
  ctaLabel: string;
  ctaHref: string;
};

export function ActionQueueCard({
  title,
  count,
  ctaLabel,
  ctaHref,
}: ActionQueueCardProps) {
  return (
    <Card className="border-slate-200">
      <CardContent className="flex flex-col gap-3 p-4">
        <p className="text-sm text-slate-600 leading-snug">{title}</p>
        <p className="text-4xl font-bold leading-none text-slate-900">{count}</p>
        <Button asChild size="sm" className="w-full bg-slate-900 hover:bg-slate-700 text-white">
          <Link href={ctaHref}>{ctaLabel}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

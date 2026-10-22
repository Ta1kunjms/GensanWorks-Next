import { Skeleton } from "@/components/ui/skeleton";
import {
  CardListSkeleton,
  LoadingRegion,
  StatGridSkeleton,
} from "@/components/ui/skeletons";

// Mirrors the employer dashboard: welcome panel, 6 stat cards, tabbed list of recent items.
export default function EmployerDashboardLoading() {
  return (
    <LoadingRegion className="space-y-8">
      <Skeleton className="h-56 w-full rounded-xl" />
      <StatGridSkeleton count={6} announce={false} />
      <div className="space-y-5">
        <Skeleton className="h-10 w-full" />
        <CardListSkeleton count={4} announce={false} />
      </div>
    </LoadingRegion>
  );
}

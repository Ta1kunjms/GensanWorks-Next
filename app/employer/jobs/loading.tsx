import { Skeleton } from "@/components/ui/skeleton";
import {
  CardListSkeleton,
  LoadingRegion,
  PageHeaderSkeleton,
  StatGridSkeleton,
} from "@/components/ui/skeletons";

// Mirrors Manage Jobs: header with action, 5 status counts, tabs, then the job list card.
export default function EmployerJobsLoading() {
  return (
    <LoadingRegion className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <PageHeaderSkeleton />
        <Skeleton className="h-10 w-32" />
      </div>
      <StatGridSkeleton count={5} announce={false} className="md:grid-cols-5 lg:grid-cols-5" />
      <Skeleton className="h-10 w-56" />
      <div className="rounded-lg border p-6">
        <PageHeaderSkeleton className="mb-6" />
        <CardListSkeleton count={4} announce={false} />
      </div>
    </LoadingRegion>
  );
}

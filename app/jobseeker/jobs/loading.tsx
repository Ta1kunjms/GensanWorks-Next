import { Skeleton } from "@/components/ui/skeleton";
import { LoadingRegion, PageHeaderSkeleton } from "@/components/ui/skeletons";

// Mirrors Browse Jobs: header, search bar, 4 filters, then a 3-column job card grid.
export default function JobseekerJobsLoading() {
  return (
    <LoadingRegion className="space-y-6">
      <PageHeaderSkeleton />
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="mt-2 h-4 w-1/2" />
            <Skeleton className="mt-4 h-9 w-full" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

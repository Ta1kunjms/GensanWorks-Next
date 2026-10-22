import { Skeleton } from "@/components/ui/skeleton";
import {
  CardListSkeleton,
  LoadingRegion,
  StatGridSkeleton,
} from "@/components/ui/skeletons";

// Mirrors the jobseeker dashboard: status banner, the 6 stat cards, then
// recent applications (2/3 width) beside the latest jobs (1/3 width).
export default function JobseekerDashboardLoading() {
  return (
    <LoadingRegion className="space-y-8">
      <Skeleton className="h-20 w-full rounded-xl" />
      <StatGridSkeleton
        count={6}
        announce={false}
        className="grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
      />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-8 w-56" />
          <CardListSkeleton count={3} announce={false} />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-8 w-40" />
          <CardListSkeleton count={3} announce={false} />
        </div>
      </div>
    </LoadingRegion>
  );
}

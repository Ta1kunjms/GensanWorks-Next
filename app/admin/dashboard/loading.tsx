import { Skeleton } from "@/components/ui/skeleton";
import {
  LoadingRegion,
  PageHeaderSkeleton,
  StatGridSkeleton,
} from "@/components/ui/skeletons";

// Mirrors the admin dashboard: header with period picker, 6 KPI cards, 5 queue cards, 2 panels.
export default function Loading() {
  return (
    <LoadingRegion className="space-y-6">
      <div className="flex flex-col gap-3 border-b pb-4 md:flex-row md:items-center md:justify-between">
        <PageHeaderSkeleton />
        <Skeleton className="h-9 w-48" />
      </div>
      <StatGridSkeleton count={6} announce={false} className="md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6" />
      <StatGridSkeleton count={5} announce={false} className="md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-5" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    </LoadingRegion>
  );
}

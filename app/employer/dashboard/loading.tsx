import { Skeleton } from "@/components/ui/skeleton";

export default function EmployerDashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-64" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-6 bg-white rounded-lg border">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-9 w-16" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-48 w-full" />
        </div>
        <div className="bg-white rounded-lg border p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <Skeleton className="h-10 w-full" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 border-b">
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingRegion } from "@/components/ui/skeletons";

// Neutral public-page skeleton (no gradients): header bar, centered hero, content cards.
export default function RootLoading() {
  return (
    <LoadingRegion className="min-h-screen bg-white">
      <div className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Skeleton className="h-8 w-32" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 text-center">
        <Skeleton className="mx-auto mb-4 h-10 w-64 max-w-full" />
        <Skeleton className="mx-auto mb-8 h-6 w-96 max-w-full" />
        <div className="flex justify-center gap-4">
          <Skeleton className="h-11 w-40" />
          <Skeleton className="h-11 w-40" />
        </div>
      </div>

      <div className="container mx-auto grid grid-cols-1 gap-6 px-4 pb-16 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    </LoadingRegion>
  );
}

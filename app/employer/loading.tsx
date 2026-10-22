import {
  CardListSkeleton,
  LoadingRegion,
  PageHeaderSkeleton,
  StatGridSkeleton,
} from "@/components/ui/skeletons";

// Content-area skeleton only: the employer layout already renders the sidebar and header.
export default function EmployerLoading() {
  return (
    <LoadingRegion className="space-y-6">
      <PageHeaderSkeleton />
      <StatGridSkeleton count={3} announce={false} className="lg:grid-cols-3" />
      <CardListSkeleton count={4} announce={false} />
    </LoadingRegion>
  );
}

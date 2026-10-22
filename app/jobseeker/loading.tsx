import {
  CardListSkeleton,
  LoadingRegion,
  PageHeaderSkeleton,
} from "@/components/ui/skeletons";

// Content-area skeleton only: the jobseeker layout already renders the sidebar and header.
export default function JobseekerLoading() {
  return (
    <LoadingRegion className="space-y-6">
      <PageHeaderSkeleton />
      <CardListSkeleton count={4} announce={false} />
    </LoadingRegion>
  );
}

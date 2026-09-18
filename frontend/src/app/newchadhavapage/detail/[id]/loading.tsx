import { PageSkeleton, DetailSkeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <PageSkeleton>
      <DetailSkeleton />
    </PageSkeleton>
  );
}

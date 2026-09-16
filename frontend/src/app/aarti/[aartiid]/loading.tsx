import { PageSkeleton, ArticleSkeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <PageSkeleton>
      <ArticleSkeleton />
    </PageSkeleton>
  );
}

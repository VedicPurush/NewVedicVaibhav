import { PageSkeleton, ListingSkeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <PageSkeleton>
      <ListingSkeleton cards={9}/>
    </PageSkeleton>
  );
}

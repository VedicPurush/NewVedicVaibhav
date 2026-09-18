import { PageSkeleton, GenericSkeleton } from "@/components/shared/skeletons";

/**
 * The site-wide navigation fallback.
 *
 * Next renders this the instant a navigation to any route begins, instead of
 * leaving the user on the previous page until the server responds. Nearly every
 * page here is an async server component that awaits the backend — often twice,
 * once in generateMetadata and once in the page body — so without this file a
 * card tap looked like it had done nothing for the whole round trip.
 *
 * Segments with a shape worth matching override it with their own loading.tsx.
 */
export default function Loading() {
  return (
    <PageSkeleton>
      <GenericSkeleton />
    </PageSkeleton>
  );
}

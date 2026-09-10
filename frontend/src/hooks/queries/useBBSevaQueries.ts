import { useQuery } from "@tanstack/react-query";
import { BB_SEVA_KEYS } from "@/lib/query-keys/bbSeva.keys";
import { fetchBBPackages } from "@/components/pages/services/banke-bihariji/api/bbPackage.api";
import { fetchBBSevaReviews } from "@/components/pages/services/banke-bihariji/api/bbSeva.api";

export const useBBPackagesQuery = () =>
  useQuery({
    queryKey: BB_SEVA_KEYS.packages(),
    queryFn: fetchBBPackages,
    staleTime: 30 * 60 * 1000, // 30 min — package list is stable
    gcTime: 60 * 60 * 1000,
  });

export const useBBSevaReviewsQuery = (page: number, limit: number = 10) =>
  useQuery({
    queryKey: BB_SEVA_KEYS.reviews(page, limit),
    queryFn: () => fetchBBSevaReviews(page, limit),
    staleTime: 5 * 60 * 1000, // 5 min — user-generated content, fresher
    gcTime: 30 * 60 * 1000,
    placeholderData: (prev) => prev, // keep previous page data while fetching next
  });

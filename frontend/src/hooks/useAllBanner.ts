import { useQuery } from "@tanstack/react-query";
import { fetchAllBanners } from "@/lib/api/banner";

/**
 * @param initialData Optional server-fetched banners. When supplied, the first
 * client render already has the list, so the hero paints without waiting for a
 * round trip after hydration.
 */
export const useAllBanners = (initialData?: unknown[] | null) =>
  useQuery({
    queryKey: ["allBanners"],
    queryFn: fetchAllBanners,
    ...(initialData ? { initialData } : {}),
  });

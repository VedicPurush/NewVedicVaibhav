import { useQuery } from "@tanstack/react-query";
import { fetchVedicPromos } from "@/lib/api/promo.api";
import type { PromoCode } from "@/lib/api/promo.api";
import { PROMO_KEYS } from "@/lib/query-keys/promo.keys";

export const useVedicPromosQuery = () =>
  useQuery<PromoCode[], Error>({
    queryKey: PROMO_KEYS.listVedic(),
    queryFn: fetchVedicPromos,

    // Stop refetching "again and again"
    staleTime: 12 * 60 * 60 * 1000, // 12 hours
    gcTime: 24 * 60 * 60 * 1000,

    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

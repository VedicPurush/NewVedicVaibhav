import { useQuery } from "@tanstack/react-query";
import { JYOTIRLINGA_KEYS } from "@/lib/query-keys/jyotirlinga.keys";
import { fetchJyotirlingas } from "@/lib/api/jyotirlinga.api";
import type { IJyotirlinga } from "@/components/pages/services/twelve-jyotirling/index";

export const useJyotirlingaListQuery = () =>
  useQuery<IJyotirlinga[]>({
    queryKey: JYOTIRLINGA_KEYS.list(),
    queryFn: fetchJyotirlingas,
    staleTime: 15 * 60 * 1000, // 15 min
    gcTime: 60 * 60 * 1000, // 1 hour
  });

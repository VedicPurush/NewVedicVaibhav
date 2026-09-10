import { useQuery } from "@tanstack/react-query";
import { JYOTIRLINGA_PLANS_KEYS } from "@/lib/query-keys/jyotirlingaPlans.keys";
import { fetchJyotirlingaPlans } from "@/lib/api/jyotirlingaPlans.api";
import type { JyotirlingaPlan } from "@/lib/api/jyotirlingaPlans.api";

export const useJyotirlingaPlansQuery = () =>
  useQuery<JyotirlingaPlan[]>({
    queryKey: JYOTIRLINGA_PLANS_KEYS.list(),
    queryFn: fetchJyotirlingaPlans,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

import { useQuery } from "@tanstack/react-query";
import { YATRA_KEYS } from "@/lib/query-keys/yatra.keys";
import { fetchActive4DhamYatraApi } from "@/components/pages/services/four-dham-yatra/api/fourDhamYatraApi";

export const useActive4DhamYatraQuery = () =>
  useQuery({
    queryKey: YATRA_KEYS.active(),
    queryFn: fetchActive4DhamYatraApi,
    staleTime: 30 * 60 * 1000, // 30 min — single active record, rarely changes
    gcTime: 60 * 60 * 1000,    // 1 hour
  });

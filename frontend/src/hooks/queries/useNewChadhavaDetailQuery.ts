import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NEW_CHADHAVA_KEYS } from "@/lib/query-keys/newChadhava.keys";
import { fetchNewChadhavaById } from "@/lib/api/newChadhava.api";
import type { NewChadhavaItem } from "@/lib/api/newChadhava.api";

export const useNewChadhavaDetailQuery = (id: string) => {
  const qc = useQueryClient();

  return useQuery({
    queryKey: NEW_CHADHAVA_KEYS.detail(id),
    queryFn: () => fetchNewChadhavaById(id),
    enabled: !!id,
    staleTime: 30 * 60 * 1000, // 30 minutes

    // Initial Data: Hydrate from list cache for instant load
    initialData: () => {
      const list = qc.getQueryData<NewChadhavaItem[]>(NEW_CHADHAVA_KEYS.list());
      if (!list) return undefined;
      return list.find((x) => String(x._id) === String(id));
    },
  });
};

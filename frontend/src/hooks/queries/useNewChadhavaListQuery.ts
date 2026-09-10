import { useQuery } from "@tanstack/react-query";
import { NEW_CHADHAVA_KEYS } from "@/lib/query-keys/newChadhava.keys";
import { fetchNewChadhavaList, type NewChadhavaItem } from "@/lib/api/newChadhava.api";

/**
 * @param serverPreview A trimmed, server-rendered subset (see lib/server/homeData).
 * Passed as `placeholderData`, not `initialData`, on purpose: it is shown for the
 * first paint but never written to the cache, so the query still fetches the
 * full list immediately and replaces it. Using `initialData` here would park the
 * truncated preview in the cache for the whole staleTime.
 */
export const useNewChadhavaListQuery = (
  enabled = true,
  serverPreview?: NewChadhavaItem[] | null,
) => {
  return useQuery({
    queryKey: NEW_CHADHAVA_KEYS.list(),
    queryFn: fetchNewChadhavaList,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled,
    ...(serverPreview?.length ? { placeholderData: serverPreview } : {}),
  });
};

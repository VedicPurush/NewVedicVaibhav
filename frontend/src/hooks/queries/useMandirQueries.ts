import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MANDIR_KEYS } from "@/lib/query-keys/mandir.keys";
import { fetchActiveMandirs, fetchMandirById, type Mandir } from "@/lib/api/mandir.api";

/** @param serverPreview Trimmed server-rendered subset — name lookups only, shown
 * for the first paint and replaced by the real fetch (see lib/server/homeData). */
export const useActiveMandirsQuery = (serverPreview?: Mandir[] | null) => {
  return useQuery({
    queryKey: MANDIR_KEYS.activeList(),
    queryFn: fetchActiveMandirs,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    ...(serverPreview?.length ? { placeholderData: serverPreview } : {}),
  });
};

export const useMandirDetailQuery = (id: string) => {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: MANDIR_KEYS.detail(id),
    queryFn: () => fetchMandirById(id),
    enabled: !!id,
    staleTime: 60 * 60 * 1000, // 1 hour
    initialData: () => {
      // Check if we have this mandir in the active list cache
      const activeMandirs = queryClient.getQueryData<any[]>(MANDIR_KEYS.activeList());
      return activeMandirs?.find((m) => m._id === id);
    },
    initialDataUpdatedAt: () => {
      const state = queryClient.getQueryState(MANDIR_KEYS.activeList());
      return state?.dataUpdatedAt;
    },
  });
};

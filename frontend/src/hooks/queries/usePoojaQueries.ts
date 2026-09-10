import { useQuery } from "@tanstack/react-query";
import { PUJA_KEYS } from "@/lib/query-keys/puja.keys";
import {
  fetchAllPoojas,
  fetchAllExclusivePoojas,
  fetchActivePoojaById,
  fetchPersonalizedPoojasByMandir,
  fetchAllPersonalizedPoojas,
  fetchAllNewPoojas,
  fetchAllPoojasCombined,
  fetchAnyPoojaById,
} from "@/lib/api/puja.api";

export const useAllPoojasQuery = (enabled = true) => {
  return useQuery({
    queryKey: PUJA_KEYS.list(),
    queryFn: fetchAllPoojas,
    staleTime: 15 * 60 * 1000, // 15 min
    enabled,
  });
};

export const useExclusivePoojasQuery = (enabled = true) => {
  return useQuery({
    queryKey: PUJA_KEYS.exclusive(),
    queryFn: fetchAllExclusivePoojas,
    staleTime: 15 * 60 * 1000, // 15 min
    enabled,
  });
};

export const usePoojaDetailQuery = (id: string) => {
  return useQuery({
    queryKey: PUJA_KEYS.activeDetail(id),
    queryFn: () => fetchActivePoojaById(id),
    enabled: !!id,
    staleTime: 30 * 60 * 1000, // 30 min
  });
};

/** Poojas from the new `newpoojas` collection only. */
export const useNewPoojasQuery = () => {
  return useQuery({
    queryKey: PUJA_KEYS.newList(),
    queryFn: fetchAllNewPoojas,
    staleTime: 15 * 60 * 1000,
  });
};

/** Legacy + new poojas in one list, each tagged with `source`.
 *
 * @param serverPreview Trimmed server-rendered subset, shown for the first paint
 * only — see the note on useNewChadhavaListQuery for why this is
 * `placeholderData` rather than `initialData`. */
export const useCombinedPoojasQuery = (serverPreview?: unknown[] | null) => {
  return useQuery({
    queryKey: PUJA_KEYS.combined(),
    queryFn: fetchAllPoojasCombined,
    staleTime: 15 * 60 * 1000,
    ...(serverPreview?.length ? { placeholderData: serverPreview } : {}),
  });
};

/** Detail lookup that resolves against either collection. */
export const useAnyPoojaDetailQuery = (id: string) => {
  return useQuery({
    queryKey: PUJA_KEYS.anyDetail(id),
    queryFn: () => fetchAnyPoojaById(id),
    enabled: !!id,
    staleTime: 30 * 60 * 1000,
  });
};

export const useAllPersonalizedPoojasQuery = () => {
  return useQuery({
    queryKey: PUJA_KEYS.allPersonalized(),
    queryFn: fetchAllPersonalizedPoojas,
    staleTime: 15 * 60 * 1000, // 15 min
  });
};

export const usePersonalizedPoojasQuery = (mandirId: string) => {
  return useQuery({
    queryKey: ["poojas", "personalized", mandirId],
    queryFn: () => fetchPersonalizedPoojasByMandir(mandirId),
    enabled: !!mandirId,
    staleTime: 15 * 60 * 1000, // 15 min
  });
};

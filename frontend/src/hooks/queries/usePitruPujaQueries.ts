import { useEffect } from "react";
import { useIsRestoring, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAllPitruPujas, fetchPitruPujaByPujaId, type PitruPuja } from "@/lib/api/pitruPuja.api";

const pitruPujaKey = (pujaId: string) => ["pitruPuja", "detail", pujaId] as const;

/**
 * `serverPuja` is the complete document fetched on the server (see
 * lib/server/pitruPujaData.ts), so it is passed as `initialData` rather than
 * `placeholderData` — unlike the homepage previews, there is nothing missing
 * from it that the client needs to re-fetch. Combined with `staleTime`, that
 * means a fresh page load performs no client-side request at all, and the first
 * render already has the banner and copy.
 *
 * `initialData` only applies when the key is not cached yet. This cache is
 * persisted to IndexedDB, so a copy saved before an admin edit (e.g. a newly
 * added date) would otherwise outlive it — which kept the puja off the
 * /services/puja listing. Hence the server copy is written over the cache, and
 * `staleTime` is short enough that the listing refetches soon after an edit.
 */
export const usePitruPujaQuery = (pujaId: string, serverPuja?: PitruPuja | null) => {
  const queryClient = useQueryClient();
  const isRestoring = useIsRestoring();

  // Waits for the IndexedDB restore, then one more tick: the persister subscribes
  // in PersistQueryClientProvider's effect, which runs after this (child) effect
  // in the same commit. A write before that is never saved, and the next full
  // page load would restore the old copy again.
  useEffect(() => {
    if (!serverPuja || isRestoring) return;
    const timer = setTimeout(() => queryClient.setQueryData(pitruPujaKey(pujaId), serverPuja), 0);
    return () => clearTimeout(timer);
  }, [queryClient, pujaId, serverPuja, isRestoring]);

  return useQuery({
    queryKey: pitruPujaKey(pujaId),
    queryFn: () => fetchPitruPujaByPujaId(pujaId),
    enabled: !!pujaId,
    staleTime: 60 * 1000,
    ...(serverPuja ? { initialData: serverPuja } : {}),
  });
};

const pitruPujaListKey = ["pitruPuja", "list"] as const;

/**
 * Every active pitru puja, for the callers that list them.
 *
 * `serverPujas` is written over the cache for the same reason the detail query
 * does it: this cache is persisted to IndexedDB, so a list saved before an
 * admin added a puja would otherwise outlive it and keep the new puja hidden.
 */
export const usePitruPujasQuery = (serverPujas?: PitruPuja[] | null) => {
  const queryClient = useQueryClient();
  const isRestoring = useIsRestoring();

  useEffect(() => {
    if (!serverPujas || isRestoring) return;
    const timer = setTimeout(() => queryClient.setQueryData(pitruPujaListKey, serverPujas), 0);
    return () => clearTimeout(timer);
  }, [queryClient, serverPujas, isRestoring]);

  return useQuery({
    queryKey: pitruPujaListKey,
    queryFn: fetchAllPitruPujas,
    staleTime: 60 * 1000,
    ...(serverPujas ? { initialData: serverPujas } : {}),
  });
};

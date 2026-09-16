import { useQuery } from "@tanstack/react-query";
import { fetchPitruPujaByPujaId, type PitruPuja } from "@/lib/api/pitruPuja.api";

/**
 * `serverPuja` is the complete document fetched on the server (see
 * lib/server/pitruPujaData.ts), so it is passed as `initialData` rather than
 * `placeholderData` — unlike the homepage previews, there is nothing missing
 * from it that the client needs to re-fetch. Combined with `staleTime`, that
 * means a fresh page load performs no client-side request at all, and the first
 * render already has the banner and copy.
 */
export const usePitruPujaQuery = (pujaId: string, serverPuja?: PitruPuja | null) => {
  return useQuery({
    queryKey: ["pitruPuja", "detail", pujaId],
    queryFn: () => fetchPitruPujaByPujaId(pujaId),
    enabled: !!pujaId,
    staleTime: 15 * 60 * 1000,
    ...(serverPuja ? { initialData: serverPuja } : {}),
  });
};

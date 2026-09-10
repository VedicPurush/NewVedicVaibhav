import { useQuery } from "@tanstack/react-query";
import { fetchPitruPujaByPujaId } from "@/lib/api/pitruPuja.api";

export const usePitruPujaQuery = (pujaId: string) => {
  return useQuery({
    queryKey: ["pitruPuja", "detail", pujaId],
    queryFn: () => fetchPitruPujaByPujaId(pujaId),
    enabled: !!pujaId,
    staleTime: 15 * 60 * 1000,
  });
};

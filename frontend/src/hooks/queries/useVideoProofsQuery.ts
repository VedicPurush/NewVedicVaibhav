import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { parseVideoLink, type ParsedVideo } from "@/lib/videoLinkParser";

export const VIDEO_PROOF_KEYS = {
  all: ["videoProofs"] as const,
  active: (limit: number) => [...VIDEO_PROOF_KEYS.all, "active", limit] as const,
};

const fetchActiveVideoProofs = async (limit: number): Promise<ParsedVideo[]> => {
  const res = await api.get("/video-proofs/get-active", { params: { page: 1, limit } });
  const docs: { videoLink: string; title: string }[] = res.data?.data || [];
  return docs.map((d) => parseVideoLink(d.videoLink, d.title)).filter((v) => v.embedUrl);
};

/**
 * Was a raw axios call in a useEffect — no cache, a refetch on every mount, and
 * doubled under StrictMode. Everything else in the app reads through React Query;
 * this brings the video strip in line.
 */
export const useVideoProofsQuery = (limit = 14) =>
  useQuery({
    queryKey: VIDEO_PROOF_KEYS.active(limit),
    queryFn: () => fetchActiveVideoProofs(limit),
    staleTime: 30 * 60 * 1000,
  });

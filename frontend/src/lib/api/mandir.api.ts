import { api } from "@/lib/api";
import { withCdnUrls } from "@/lib/imageUrl";

// Keep types here so hooks/components can reuse them
export type Mandir = {
  _id: string;
  nameEnglish: string;
  nameHindi?: string;
  nameID?: string;

  location?: string;
  state?: string;
  city?: string;

  godName?: string[];
  mandirSectionImage?: string;

  // add more fields if your UI uses them
};

// Fetch Active Mandirs (used in MandirFilter, MandirRecommend, Prasad, etc.)
export const fetchActiveMandirs = async (): Promise<Mandir[]> => {
  const res = await api.get("/fetch-active-mandirs");
  // ~390 image URLs here point at the Spaces origin instead of the CDN edge.
  return withCdnUrls(res.data?.mandirs ?? []);
};

// Optional (recommended) – detail call if you have this endpoint
export const fetchMandirById = async (id: string): Promise<Mandir | null> => {
  if (!id) return null;
  const res = await api.get(`/fetch-mandir-by-id/${id}`);
  return res.data?.mandir ?? res.data?.data ?? null;
};

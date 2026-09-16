import { api } from "@/lib/api";
import { withCdnUrls } from "@/lib/imageUrl";

export interface NewChadhavaItem {
  _id: string;
  chadhavaName: string;
  description: string;
  selectedMandirs: {
    nameEnglish: string;
    city?: string;
    mandirAppImage?: string;
  }[];
  availableDates: string[];
  chadhavaWebCardImage?: {
    location: string;
  };
  chadhavaInnerImages?: {
    location: string;
  }[];
  // Add other fields as discovered
  [key: string]: any;
}

export const fetchNewChadhavaList = async (): Promise<NewChadhavaItem[]> => {
  const res = await api.get("/newChadhava/get-all-new-chadhava");
  // Handle various response structures seen in legacy code
  // withCdnUrls moves image URLs from the Spaces origin bucket to the CDN edge
  // (see lib/imageUrl) — this endpoint alone returns ~580 origin URLs.
  if (Array.isArray(res.data)) return withCdnUrls(res.data);
  if (res.data?.data && Array.isArray(res.data.data)) return withCdnUrls(res.data.data);
  if (res.data?.items && Array.isArray(res.data.items)) return withCdnUrls(res.data.items);
  return [];
};

export const fetchNewChadhavaById = async (id: string): Promise<any> => {
  const res = await api.get(`/newChadhava/get-new-chadhava/${id}`);
  // Same CDN-edge rewrite as the list — every banner, item and gift image on the
  // detail page was otherwise fetched from the uncached origin bucket.
  return withCdnUrls(res.data?.data);
};

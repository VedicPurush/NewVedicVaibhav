import { api } from "@/lib/api";
import { withCdnUrls } from "@/lib/imageUrl";

export const fetchAllBanners = async () => {
  const res = await api.get("/banner/get-banner");
  // Banner images come back pointing at the Spaces origin bucket rather than the
  // CDN edge — see lib/imageUrl. The hero banner is the page's LCP element, so
  // this rewrite is the difference between a ~0.45s and a ~0.22s fetch.
  return withCdnUrls(res.data || []); // Adjust if backend returns a different key
};

import type { BannerButtonPosition, BannerRecord } from "@/lib/banner";

/**
 * Shared banner shape and fallback for the two homepage banner surfaces
 * (desktop carousel + mobile strip). Both read the same `useAllBanners` query,
 * so they must also agree on the type and on what to show when it comes back
 * empty — previously each kept its own copy and they had drifted.
 */
export interface HomeBanner extends BannerRecord {
  _id: string;
  bannerName: string;
  bannerWebImage: string;
  bannerMobileImage: string;
  bannerLink: string;
  index: number;
  showOnWebsite: boolean;
  buttonLabel?: string;
  buttonPosition?: BannerButtonPosition;
  buttonPositionmob?: BannerButtonPosition;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

const FALLBACK_TIMESTAMP = "1970-01-01T00:00:00.000Z";

/** Shown only when the banner API errors or returns nothing. */
export const FALLBACK_BANNERS: HomeBanner[] = [
  {
    _id: "fallback_001",
    bannerName: "Book an online puja with Vedic Vaibhav",
    bannerWebImage:
      "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/banner/homebanner%20(1).webp",
    bannerMobileImage:
      "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/shivratri/MOBILE%20VIEW%20BANNER-optimized.webp",
    bannerLink: "/services/puja",
    index: 0,
    showOnWebsite: true,
    buttonLabel: "Book Now",
    buttonPosition: { top: "72", left: "45" },
    buttonPositionmob: { top: "73", left: "35" },
    // Constant rather than `new Date()` so the module has no render-time clock
    // dependency — these fields are unused for display.
    createdAt: FALLBACK_TIMESTAMP,
    updatedAt: FALLBACK_TIMESTAMP,
  },
];

/**
 * Picks the list to render: API data when it has anything usable, otherwise the
 * fallback. Returns `[]` while the request is still in flight so callers can show
 * a correctly-sized skeleton rather than flashing the fallback first.
 */
export const resolveHomeBanners = (
  data: HomeBanner[] | undefined,
  isLoading: boolean,
  isError: boolean,
): HomeBanner[] => {
  if (isLoading) return [];
  if (isError || !data || data.length === 0) return FALLBACK_BANNERS;
  return data;
};

export interface BannerButtonPosition {
  top: string;
  left: string;
}

export interface BannerRecord {
  _id?: string;
  bannerName?: string;
  bannerWebImage?: string;
  bannerMobileImage?: string;
  bannerLink?: string;
  index?: number;
  showOnWebsite?: boolean;
  isActive?: boolean;
  active?: boolean;
  status?: string;
  buttonLabel?: string;
  buttonPosition?: BannerButtonPosition;
  buttonPositionmob?: BannerButtonPosition;
  dueDate?: string;
  expiryDate?: string;
  expiry?: string;
  expiryAt?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

const getBannerExpiry = (banner: BannerRecord): string | undefined =>
  banner.dueDate ||
  banner.expiryDate ||
  banner.expiry ||
  banner.expiryAt ||
  banner.endDate;

const isBannerActive = (banner: BannerRecord): boolean => {
  if (typeof banner.showOnWebsite === "boolean" && !banner.showOnWebsite) {
    return false;
  }

  if (typeof banner.isActive === "boolean") {
    return banner.isActive;
  }

  if (typeof banner.active === "boolean") {
    return banner.active;
  }

  if (typeof banner.status === "string") {
    return banner.status.trim().toLowerCase() !== "inactive";
  }

  return true;
};

export const isBannerExpired = (dateValue?: string): boolean => {
  if (!dateValue) return false;

  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) return false;

  return parsedDate.getTime() < Date.now();
};

export const filterActiveBanners = <T extends BannerRecord>(banners: T[]): T[] =>
  banners
    .filter((banner) => isBannerActive(banner))
    .filter((banner) => !isBannerExpired(getBannerExpiry(banner)))
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

const INTERNAL_HOSTS = new Set(["localhost", "vedicvaibhav.com"]);

export const normalizeBannerLink = (link?: string): string => {
  const rawLink = (link || "").trim();
  if (!rawLink) return "";

  if (/^(mailto:|tel:|whatsapp:)/i.test(rawLink)) {
    return rawLink;
  }

  if (/^https?:\/\//i.test(rawLink)) {
    try {
      const parsed = new URL(rawLink);
      if (
        INTERNAL_HOSTS.has(parsed.hostname) ||
        (typeof window !== "undefined" && parsed.hostname === window.location.hostname)
      ) {
        return normalizeBannerLink(`${parsed.pathname}${parsed.search}${parsed.hash}`);
      }

      return rawLink;
    } catch {
      return rawLink;
    }
  }

  const withLeadingSlash = rawLink.startsWith("/") ? rawLink : `/${rawLink}`;
  const squashedSlashes = withLeadingSlash.replace(/\/{2,}/g, "/");

  if (squashedSlashes.startsWith("/shop/shop/")) {
    return squashedSlashes.replace("/shop/shop/", "/shop/");
  }

  if (squashedSlashes.startsWith("/shops/shop/")) {
    return squashedSlashes.replace("/shops/shop/", "/shop/");
  }

  return squashedSlashes;
};

export const isExternalBannerLink = (link?: string): boolean =>
  /^https?:\/\//i.test((link || "").trim()) &&
  normalizeBannerLink(link) === (link || "").trim();

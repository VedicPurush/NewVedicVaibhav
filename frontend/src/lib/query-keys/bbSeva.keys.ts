export const BB_SEVA_KEYS = {
  all: ["bb-seva"] as const,
  packages: () => [...BB_SEVA_KEYS.all, "packages"] as const,
  reviews: (page: number, limit: number) =>
    [...BB_SEVA_KEYS.all, "reviews", { page, limit }] as const,
};

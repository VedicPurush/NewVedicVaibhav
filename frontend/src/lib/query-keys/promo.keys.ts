export const PROMO_KEYS = {
  all: ["promo"] as const,
  listVedic: () => [...PROMO_KEYS.all, "vedic"] as const,
};

export const YATRA_KEYS = {
  all: ["4dham-yatra"] as const,
  active: () => [...YATRA_KEYS.all, "active"] as const,
};

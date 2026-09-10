export const JYOTIRLINGA_KEYS = {
  all: ["jyotirlinga"] as const,
  list: () => [...JYOTIRLINGA_KEYS.all, "list"] as const,
};

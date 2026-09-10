export const JYOTIRLINGA_PLANS_KEYS = {
  all: ["jyotirlinga-plans"] as const,
  list: () => [...JYOTIRLINGA_PLANS_KEYS.all, "list"] as const,
};

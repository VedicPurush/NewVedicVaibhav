export const FEEDBACK_KEYS = {
  all: ["feedback"] as const,
  list: () => [...FEEDBACK_KEYS.all, "list"] as const,
};

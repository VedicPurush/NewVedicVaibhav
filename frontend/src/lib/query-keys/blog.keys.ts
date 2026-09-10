export const BLOG_KEYS = {
  all: ["blogs"] as const,
  list: (limit?: number) => [...BLOG_KEYS.all, "list", { limit }] as const,
  detail: (id: string) => [...BLOG_KEYS.all, "detail", id] as const,
};

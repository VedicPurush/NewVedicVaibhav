export const NEW_CHADHAVA_KEYS = {
  all: ["new-chadhava"] as const,
  list: () => [...NEW_CHADHAVA_KEYS.all, "list"] as const,
  detail: (id: string) => [...NEW_CHADHAVA_KEYS.all, "detail", id] as const,
};

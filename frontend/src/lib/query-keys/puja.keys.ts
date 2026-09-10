export const PUJA_KEYS = {
  all: ["poojas"] as const,
  list: () => [...PUJA_KEYS.all, "list"] as const,
  exclusive: () => [...PUJA_KEYS.all, "exclusive"] as const,
  activeDetail: (id: string) => [...PUJA_KEYS.all, "activeDetail", id] as const,
  allPersonalized: () => [...PUJA_KEYS.all, "allPersonalized"] as const,
  newList: () => [...PUJA_KEYS.all, "newList"] as const,
  combined: () => [...PUJA_KEYS.all, "combined"] as const,
  anyDetail: (id: string) => [...PUJA_KEYS.all, "anyDetail", id] as const,
};

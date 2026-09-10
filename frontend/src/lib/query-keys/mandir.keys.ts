export const MANDIR_KEYS = {
  all: ["mandir"] as const,

  // Active mandirs list
  activeList: () => [...MANDIR_KEYS.all, "activeList"] as const,

  // Mandir detail by id
  detail: (id: string) => [...MANDIR_KEYS.all, "detail", id] as const,
};

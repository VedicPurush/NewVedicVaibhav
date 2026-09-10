import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutes fresh
      gcTime: 12 * 60 * 60 * 1000, // 12 hours in memory (must be >= persist maxAge)
      refetchOnWindowFocus: false, // Safari / iOS friendly
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

import { useQuery } from "@tanstack/react-query";
import { BLOG_KEYS } from "@/lib/query-keys/blog.keys";
import { fetchAllBlogs, type Blog } from "@/lib/api/blogsApi";

// Backward-compat hook: keep old import path working.
// Prefer using hooks/queries/useBlogQueries.ts going forward.
export const useAllBlogs = (limit?: number, enabled = true) =>
  useQuery<Blog[], Error>({
    queryKey: BLOG_KEYS.list(limit),
    queryFn: () => fetchAllBlogs(limit),

    staleTime: 12 * 60 * 60 * 1000, // 12 hours
    gcTime: 24 * 60 * 60 * 1000, // 24 hours

    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1,
    enabled,
  });

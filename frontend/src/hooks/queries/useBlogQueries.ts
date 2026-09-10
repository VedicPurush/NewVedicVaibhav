import { useQuery } from "@tanstack/react-query";
import { BLOG_KEYS } from "@/lib/query-keys/blog.keys";
import { fetchAllBlogs, fetchBlogById } from "@/lib/api/blogsApi";

export const useAllBlogsQuery = (limit?: number) => {
  return useQuery({
    queryKey: BLOG_KEYS.list(limit),
    queryFn: () => fetchAllBlogs(limit),
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
  });
};

export const useLatestBlogsQuery = () => useAllBlogsQuery(3); // implied limit or just useAllBlogsQuery

export const useBlogDetailQuery = (id: string) => {
  return useQuery({
    queryKey: BLOG_KEYS.detail(id),
    queryFn: () => fetchBlogById(id),
    enabled: !!id,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
};

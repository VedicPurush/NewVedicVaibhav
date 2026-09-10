import axios from "axios";
import { api } from "@/lib/api";
import { withCdnUrls } from "@/lib/imageUrl";

// Blog interface shared across UI + hooks
export interface Blog {
  _id: string;
  title: string;
  titleHindi?: string;
  description: string;
  images?: string[];
  addedOn: string;
  author: string;
  hashtags?: string[];
}

// Helper to normalize backend responses that might be either:
//   - an array directly
//   - { data: [...] }
//   - { data: { data: [...] } }
const unwrapList = (payload: any): Blog[] => {
  const a = payload?.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(a)) return a;
  if (Array.isArray(a?.data)) return a.data;
  return [];
};

const unwrapOne = (payload: any): Blog | null => {
  if (!payload) return null;
  const a = payload?.data;
  // blog object directly
  if (payload?._id) return payload as Blog;
  // { data: blog }
  if (a?._id) return a as Blog;
  // { data: { data: blog } }
  if (a?.data?._id) return a.data as Blog;
  return null;
};

/**
 * Fetches blogs from the API.
 * Supports optional `limit` query param if your backend implements it.
 */
export const fetchAllBlogs = async (limit?: number): Promise<Blog[]> => {
  try {
    const res = await api.get("/fetch-blogs", {
      params: typeof limit === "number" ? { limit } : undefined,
    });
    // Blog imagery is served from the Spaces origin bucket rather than the CDN
    // edge — see lib/imageUrl.
    return withCdnUrls(unwrapList(res.data));
  } catch (err) {
    // The backend returns 404 (not an empty 200 array) when there are simply
    // no blogs yet — that's a valid empty state, not a failure, so it should
    // render the page's existing "no blogs" UI rather than an error message.
    // Any other status (500, network, timeout) is a real failure and still throws.
    if (axios.isAxiosError(err) && err.response?.status === 404) return [];
    throw err;
  }
};

/**
 * Backward-compatible: previous code expected "latest 3".
 */
export const fetchLatestBlogs = async (): Promise<Blog[]> => {
  return fetchAllBlogs(3);
};

/**
 * Fetch a single blog by id (for BlogDetail page).
 */
export const fetchBlogById = async (id: string): Promise<Blog | null> => {
  const blogId = String(id || "");
  if (!blogId) return null;

  const res = await api.get(`/fetch-blog-by-id/${encodeURIComponent(blogId)}`);
  return unwrapOne(res.data);
};

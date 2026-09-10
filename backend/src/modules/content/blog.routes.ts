import { Router } from "express";
import { fetchAllBlogs, fetchBlogById } from "./blog.controller";

// Mounted at "/" in app.ts
const router = Router();

router.get("/fetch-blogs", fetchAllBlogs);
router.get("/fetch-blog-by-id/:id", fetchBlogById);

export default router;

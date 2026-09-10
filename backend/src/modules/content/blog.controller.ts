import type { Request, Response } from "express";
import { Blog } from "./blog.model";

export const fetchAllBlogs = async (_req: Request, res: Response): Promise<void> => {
  const blogs = await Blog.find().sort({ addedOn: -1 });
  if (blogs.length === 0) {
    // Legacy shape: no `success` field on this 404.
    res.status(404).json({ message: "No blogs found." });
    return;
  }
  res.status(200).json(blogs);
};

export const fetchBlogById = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const blog = await Blog.findById(req.params.id);
  if (!blog) {
    res.status(404).json({ message: "Blog not found." });
    return;
  }
  res.status(200).json(blog);
};

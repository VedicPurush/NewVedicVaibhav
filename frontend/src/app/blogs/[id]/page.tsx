import type { Metadata } from "next";
import BlogDetail from "@/components/pages/blogs/BlogDetail";
import { fetchBlogById } from "@/lib/api/blogsApi";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  let blog: any = null;
  try {
    blog = await fetchBlogById(id);
  } catch {
    blog = null;
  }

  const blogTitle = blog?.title || blog?.titleHindi || "Blog";
  const blogDescription = String(blog?.description || "").slice(0, 160).trim();
  const blogImage =
    blog?.images?.[0] ||
    "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/overall_images/og-image.jpg";
  const blogUrl = `https://vedicvaibhav.com/blogs/${id}`;

  return {
    title: `${blogTitle} | Vedic Vaibhav Blog`,
    description:
      blogDescription ||
      "Read spiritual wisdom, temple stories, and Vedic knowledge on the Vedic Vaibhav blog.",
    alternates: { canonical: blogUrl },
    openGraph: {
      title: `${blogTitle} | Vedic Vaibhav Blog`,
      description: blogDescription || "Spiritual wisdom and Vedic knowledge.",
      type: "article",
      url: blogUrl,
      images: [{ url: blogImage }],
    },
  };
}

export default function Page() {
  return <BlogDetail />;
}

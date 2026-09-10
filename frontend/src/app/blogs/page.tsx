import type { Metadata } from "next";
import { Suspense } from "react";
import Blogpage from "@/components/pages/blogs/Blogpage";

export const metadata: Metadata = {
  title: "Blogs — Vedic Knowledge, Temple Stories & Spiritual Wisdom | Vedic Vaibhav",
  description:
    "Read articles on Hindu festivals, temple histories, puja rituals, vedic science, and spiritual wisdom. Stay updated with Vedic Vaibhav's blog — your guide to Sanatan Dharma.",
  alternates: { canonical: "https://vedicvaibhav.com/blogs" },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Blogpage />
    </Suspense>
  );
}

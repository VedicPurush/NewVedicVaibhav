"use client";

import ArrowForwardIos from '@mui/icons-material/ArrowForwardIos';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import Person2 from '@mui/icons-material/Person2';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import React, { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";

import Layout from "@/components/layout/Layout";

import {
  useBlogDetailQuery,
  useAllBlogsQuery,
} from "@/hooks/queries/useBlogQueries";
import type { Blog } from "@/lib/api/blogsApi";

// Local copy of the animated gradient backdrop the old page pulled from the
// (excluded) E-com area — kept inline so the page renders pixel-identically.
const DynamicGradientAnimation: React.FC = () => (
  <motion.div
    className="fixed inset-0 z-[-1]"
    style={{
      background: 'linear-gradient(270deg, #ff7e5f, #feb47b, #86a8e7, #91eae4, #ff7e5f)',
      backgroundSize: '800% 800%',
    }}
    animate={{
      backgroundPosition: ['0% 50%', '100% 50%'],
    }}
    transition={{
      duration: 30,
      repeat: Infinity,
      ease: 'linear',
    }}
  />
);

// BlogDetail uses extra optional fields that may exist in your backend
type BlogPost = Blog & {
  titleHindi?: string;
  description2?: string;
  description3?: string;
};

const BlogDetail: React.FC = () => {
  return (
    <div>
      <Layout content={<Blogs />} activeIndex="blogs" />
    </div>
  );
};

const Blogs: React.FC = () => {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState<string>("");

  // Newsletter UI state (kept same)
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);

  // ✅ current blog (cached)
  const {
    data: blogPostRaw,
    isLoading: isDetailLoading,
    isFetching: isDetailFetching,
    isError: isDetailError,
    error: detailError,
  } = useBlogDetailQuery(id || "");

  // ✅ all blogs list (cached) for sidebar/related/tags
  const {
    data: allPostsRaw = [],
    isFetching: isListFetching,
  } = useAllBlogsQuery();

  const blogPost = blogPostRaw as BlogPost | null;
  const allPosts = allPostsRaw as BlogPost[];

  const isUpdating = !isDetailLoading && (isDetailFetching || isListFetching);

  const filteredPosts = useMemo(() => {
    const curId = String(id || "");
    return allPosts.filter((p) => String(p?._id || "") !== curId);
  }, [allPosts, id]);

  const recentPosts = useMemo(() => {
    const sorted = [...filteredPosts].sort(
      (a, b) =>
        new Date(String(b.addedOn || 0)).getTime() -
        new Date(String(a.addedOn || 0)).getTime()
    );
    return sorted.slice(0, 3);
  }, [filteredPosts]);

  const uniqueTags = useMemo(() => {
    const tagsSet = new Set<string>();
    allPosts.forEach((post) => {
      (post.hashtags ?? []).forEach((tag: string) => tagsSet.add(tag));
    });
    return Array.from(tagsSet);
  }, [allPosts]);

  const relatedPosts = useMemo(() => {
    const curTags = blogPost?.hashtags ?? [];
    if (!curTags.length) return [];
    const rel = filteredPosts.filter((post) =>
      (post.hashtags ?? []).some((t: string) => curTags.includes(t))
    );
    return rel.slice(0, 3);
  }, [blogPost?.hashtags, filteredPosts]);

  // Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) router.push(`/blogs?search=${encodeURIComponent(q)}`);
  };

  // Subscribe click
  const handleSubscribe = () => {
    setIsSubscribed(true);
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3000);
  };

  if (isDetailLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-100 z-50">
        <img loading="lazy"
          src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/vvloading.gif"
          alt="Loading..."
          className="w-32 h-32"
         />
      </div>
    );
  }

  if (isDetailError) {
    return (
      <div className="container mx-auto p-4 lg:px-8">
        <p>Error fetching blog: {String((detailError as any)?.message || detailError)}</p>
      </div>
    );
  }

  if (!blogPost) {
    return (
      <div className="container mx-auto p-4 lg:px-8">
        <p>Blog post not found.</p>
      </div>
    );
  }

  const images = blogPost.images ?? [];
  const blogTitle = blogPost.title || blogPost.titleHindi || "Blog";
  const blogDescription = (blogPost.description || "").slice(0, 160).trim();
  const blogImage = images[0] || "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/overall_images/og-image.jpg";
  const blogUrl = `https://vedicvaibhav.com/blogs/${id}`;
  const blogDate = blogPost.addedOn ? new Date(String(blogPost.addedOn)).toISOString() : undefined;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": blogTitle,
            "description": blogDescription,
            "image": blogImage,
            "url": blogUrl,
            "datePublished": blogDate,
            "author": { "@type": "Organization", "name": "Vedic Vaibhav" },
            "publisher": {
              "@type": "Organization",
              "name": "Vedic Vaibhav",
              "logo": { "@type": "ImageObject", "url": "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/overall_images/logo.png" }
            }
          }),
        }}
      />
      <DynamicGradientAnimation />

      {/* ✅ Updating badge */}
      {isUpdating && (
        <div className="mx-[6%] mt-2 mb-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 backdrop-blur border border-orange-200 text-orange-800 text-xs font-semibold shadow-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
            Updating…
          </div>
        </div>
      )}

      <div className="container mx-auto p-4 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-3/4">
            <div className="bg-white p-6 rounded-lg shadow-md">
              {/* Main Blog Image */}
              <img loading="lazy"
                src={images[0] || ""}
                alt={blogPost.title}
                className="w-full h-[20vh] md:h-[60vh] object-cover rounded-lg"
               />

              {/* Author and Date */}
              <div className="flex items-center justify-between text-gray-500 mt-4 ms-4">
                <div className="flex flex-wrap items-center gap-4 md:gap-20">
                  <span className="flex items-center gap-1">
                    <Person2 />
                    {blogPost.author}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarMonth />
                    {new Date(blogPost.addedOn).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Blog Title */}
              <h1 className="text-lg uppercase font-bold mt-6 text-gray-800">
                {blogPost.title}
              </h1>

              {/* Description */}
              <div
                className="text-gray-500 mt-2 italic"
                dangerouslySetInnerHTML={{
                  __html: String(blogPost.description || ""),
                }}
              />

              {images.length > 1 && (
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {images.slice(1, 3).map((image: string, index: number) => (
                    <img loading="lazy"
                      key={index}
                      src={image}
                      alt={`Additional Image ${index + 2}`}
                      className="w-full h-[20vh] md:h-[32vh] object-cover rounded-lg"
                     />
                  ))}
                </div>
              )}

              {/* Description 2 */}
              {blogPost.description2 && (
                <div className="flex flex-row justify-center mt-8 gap-4">
                  <div className="line h-auto border border-orange-400" />
                  <div
                    className="text-gray-700 font-bold mt-4 pb-3"
                    dangerouslySetInnerHTML={{
                      __html: String(blogPost.description2 || ""),
                    }}
                  />
                </div>
              )}

              {images.length > 3 && (
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {images.slice(3).map((image: string, index: number) => (
                    <img loading="lazy"
                      key={index}
                      src={image}
                      alt={`Additional Image ${index + 1}`}
                      className="w-full h-[20vh] md:h-[32vh] object-cover rounded-lg"
                     />
                  ))}
                </div>
              )}

              {/* Description 3 */}
              {blogPost.description3 && (
                <div
                  className="text-gray-500 mt-8"
                  dangerouslySetInnerHTML={{
                    __html: String(blogPost.description3 || ""),
                  }}
                />
              )}

              {/* Hashtags */}
              <div className="flex flex-wrap gap-2 mt-6">
                {(blogPost.hashtags ?? []).map((tag: string, index: number) => (
                  <span
                    key={index}
                    className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm cursor-pointer hover:bg-orange-500 hover:text-white transition-all"
                    onClick={() => router.push(`/blogs?tag=${encodeURIComponent(tag)}`)}
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {/* About Author */}
              <div className="mt-10 bg-gray-50 p-4 rounded-xl shadow-md">
                <h2 className="text-2xl text-gray-500">Author</h2>
                <div className="flex items-center mt-4">
                  <div className="text-gray-700 border rounded-full bg-white p-3">
                    <Person2 fontSize="large" />
                  </div>
                  <div className="ml-4">
                    <h3 className="font-bold">{blogPost.author}</h3>
                  </div>
                </div>
              </div>

              {/* Related Posts */}
              {relatedPosts.length > 0 && (
                <div className="mt-10">
                  <h2 className="text-2xl font-bold mb-4">Related Posts</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {relatedPosts.map((post: BlogPost, index: number) => (
                      <div
                        key={index}
                        className="bg-white p-4 rounded-lg shadow-md cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => router.push(`/blogs/${post._id}`)}
                      >
                        <img loading="lazy"
                          src={post.images?.[0] || ""}
                          alt={post.title}
                          className="w-full h-40 object-cover rounded-lg"
                         />
                        <h3 className="mt-4 text-lg font-bold line-clamp-1 mb-2">
                          {post.title}
                        </h3>
                        <p className="text-gray-500 line-clamp-1 text-sm">
                          {new Date(post.addedOn).toLocaleDateString()}
                        </p>
                        <a
                          href={`/blogs/${post._id}`}
                          className="text-orange-500 mt-2 inline-block"
                          onClick={(e) => e.preventDefault()}
                        >
                          Continue Reading <ArrowForwardIos fontSize="small" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-1/4">
            <div className="space-y-6">
              {/* Search Bar */}
              <div className="bg-[#3661a2] p-4 mt-6 text-white rounded-lg shadow-md">
                <form onSubmit={handleSearchSubmit} className="relative">
                  <input
                    type="text"
                    placeholder="Search Blog"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full p-4 pr-12 border border-gray-400 rounded-lg outline-none bg-[#3661a2] text-white"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-2 p-2 rounded-full bg-white text-[#3661a2]"
                  >
                    <SearchOutlined />
                  </button>
                </form>
              </div>

              {/* Recent Posts */}
              <div className="bg-white p-4 border rounded-lg shadow-md">
                <h2 className="text-lg font-bold mb-4">Recent Posts</h2>
                {recentPosts.map((post: BlogPost, index: number) => (
                  <div
                    key={index}
                    className="flex gap-4 mb-4 cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => router.push(`/blogs/${post._id}`)}
                  >
                    <img loading="lazy"
                      src={post.images?.[0] || ""}
                      alt={post.title}
                      className="w-20 h-20 object-cover rounded-lg"
                     />
                    <div className="flex flex-col justify-center">
                      <h3 className="text-sm text-gray-500 line-clamp-2 mb-2 font-bold">
                        {post.title}
                      </h3>
                      <p className="text-xs text-gray-600">
                        {new Date(post.addedOn).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Popular Tags */}
              <div className="bg-white p-4 border rounded-lg shadow-md">
                <h2 className="text-lg font-bold mb-4">Popular Tags</h2>
                <div className="flex flex-wrap gap-2 p-2 overflow-y-auto h-60">
                  {uniqueTags.map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="bg-gray-100 text-gray-600 p-2 rounded-lg hover:bg-orange-400 hover:text-white hover:scale-110 transition-all duration-300 cursor-pointer"
                      onClick={() => router.push(`/blogs?tag=${encodeURIComponent(tag)}`)}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Subscribe */}
              <div className="bg-white border p-4 rounded-lg shadow-md relative">
                <h2 className="text-lg font-bold mb-4">Subscribe to Newsletter</h2>
                <input
                  type="email"
                  placeholder="Your Email"
                  className="w-full p-4 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                  disabled={isSubscribed}
                />
                <button
                  onClick={handleSubscribe}
                  disabled={isSubscribed}
                  className={`w-full mt-4 p-4 rounded-lg transition-colors duration-300 ${isSubscribed
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-orange-500 text-white hover:bg-orange-600"
                    }`}
                >
                  {isSubscribed ? "Subscribed" : "Subscribe"}
                </button>

                {showCelebration && (
                  <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-white bg-opacity-80 rounded-lg">
                    <img loading="lazy"
                      src="https://i.pinimg.com/originals/a0/e7/12/a0e71251460ecb78160b83e5a48618a6.gif"
                      alt="Celebration"
                      className="w-80 h-80"
                     />
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
};

export default BlogDetail;

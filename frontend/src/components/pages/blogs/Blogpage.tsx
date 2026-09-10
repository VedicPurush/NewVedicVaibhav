"use client";

import { useState, useEffect } from "react";
import Fuse from "fuse.js";
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import Person from '@mui/icons-material/Person';
import { useRouter, useSearchParams } from "next/navigation";
import Layout from "@/components/layout/Layout";
import { motion } from "framer-motion";
import "./Blogpage.css";
import { useAllBlogsQuery } from "@/hooks/queries/useBlogQueries";
import type { Blog } from "@/lib/api/blogsApi";


const Blogpage = () => {
  return (
    <div>
      <Layout content={<BlogContent />} activeIndex="blogs" />
    </div>
  );
};

const BlogContent = () => {
  // Fetch blogs using the custom hook
  const {
    data: posts = [],
    isLoading,
    isFetching, // (optional) for “Updating…” badge
    error,
  } = useAllBlogsQuery();
  const [uniqueTags, setUniqueTags] = useState<string[]>([]); // State for unique tags
  const [selectedTag, setSelectedTag] = useState("All"); // State for selected tag
  const [searchQuery, setSearchQuery] = useState(""); // State for search query
  const [visiblePosts, setVisiblePosts] = useState(10); // State for visible posts
  const [showScrollTop, setShowScrollTop] = useState(false); // State for scroll to top button
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<Blog[]>([]);

  const [, setScrollProgress] = useState(0); // State for scroll progress
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract unique tags when posts change
  useEffect(() => {
    // Extract unique tags
    const tagsSet = new Set<string>();
    posts.forEach((post) => {
      if (Array.isArray(post.hashtags)) {
        post.hashtags.forEach((tag: string) => tagsSet.add(tag));
      }
    });
    setUniqueTags(Array.from(tagsSet));
  }, [posts]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const fuse = new Fuse(posts, {
      keys: ["title", "description"],
      threshold: 0.4, // fuzzy, but not too fuzzy
      minMatchCharLength: 2,
    });
    const results = fuse.search(searchQuery.trim()).map(res => res.item);
    setSearchSuggestions(results);
    setShowSuggestions(true);
  }, [searchQuery, posts]);

  // Compute top 3 most popular tags
  const tagCounts: Record<string, number> = {};
  posts.forEach((post) => {
    if (Array.isArray(post.hashtags)) {
      post.hashtags.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    }
  });
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag);

  // Read query parameters from URL and update state
  useEffect(() => {
    const tagFromUrl = searchParams?.get("tag");
    const searchFromUrl = searchParams?.get("search");

    if (tagFromUrl) {
      setSelectedTag(tagFromUrl);
      setSearchQuery(""); // Clear search query when tag is selected
    } else if (searchFromUrl) {
      setSelectedTag("Search");
      setSearchQuery(searchFromUrl);
    } else {
      setSelectedTag("All");
      setSearchQuery("");
    }
  }, [searchParams]);

  // Function to handle tag click and navigate with the selected tag
  const handleTagClick = (tag: string) => {
    if (selectedTag === tag) {
      router.push("/blogs");
    } else {
      router.push(`/blogs?tag=${tag}`);
    }
  };

  // Filter posts based on selected tag or search query
  const filteredPosts = (() => {
    if (selectedTag === "All") {
      return posts;
    } else if (selectedTag === "Search") {
      const fuse = new Fuse(posts, {
        keys: ["title", "description"],
        threshold: 0.4,
        minMatchCharLength: 2,
      });
      return fuse.search(searchQuery.trim()).map(res => res.item);
    } else {
      return posts.filter(
        (post) => post.hashtags && post.hashtags.includes(selectedTag)
      );
    }
  })();

  // Function to show more posts
  const handleShowMore = () => {
    setVisiblePosts((prev) => prev + 10);
  };

  // Scroll to top of the page
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Add event listener for scroll event
  useEffect(() => {
    // Function to handle scroll event and show scroll-to-top button
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener("scroll", handleScroll);

    // Handle scroll progress
    const handleScrollProgress = () => {
      const totalScroll = document.documentElement.scrollTop;
      const windowHeight =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;
      const scroll = (totalScroll / windowHeight) * 100;
      setScrollProgress(scroll);
    };

    window.addEventListener("scroll", handleScrollProgress);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("scroll", handleScrollProgress);
    };
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-10 text-center items-center flex justify-center h-96 mx-[6%]">
        <p>Loading...</p>
      </div>
    );
  }
  // Error state
  if (error) {
    return (
      <div className="space-y-10 text-center items-center flex justify-center h-96 mx-[6%]">
        <p>
          Server Error, please try again later. Thank you for your patience 🙏:{" "}
          {error.message}
        </p>
      </div>
    );
  }

  return (
    <>
      {!isLoading && isFetching && (
        <div className="mx-[6%] mt-2 mb-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 backdrop-blur border border-orange-200 text-orange-800 text-xs font-semibold shadow-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
            Updating…
          </div>
        </div>
      )}
      <style>
        {`
          @media (max-width: 639px) {
            .blog-tag-btn {
              font-size: 8px !important;
            }
          }
          @media (min-width: 640px) {
            .blog-tag-btn {
              font-size: 14px !important;
            }
          }
          @media (max-width: 639px) {
            .blog-card-xs {
              font-size: 11px !important;
            }
            .blog-card-xs h2 {
              font-size: 13px !important;
            }
            .blog-card-xs p,
            .blog-card-xs .text-xs,
            .blog-card-xs span {
              font-size: 10px !important;
            }
          }
          /* Hide vertical scrollbar but allow scrolling */
          /* WebKit browsers */
          ::-webkit-scrollbar {
            width: 0px;
            background: transparent;
          }
          /* Firefox */
          * {
            scrollbar-width: none;
            scrollbar-color: transparent transparent;
          }
        `}
      </style>
      <div className="md:space-y-10 space-y-4 pb-4">
        <div
          className="relative w-full h-[18vh] md:h-[40vh] bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/banner-images/Frame%201410125794-optimized.webp')",
          }}
        >
          {/* Centered Content */}
          <div className="relative z-10 flex flex-col items-center justify-center h-full text-white text-center">
            {/* Search Bar  */}
            <div className="flex items-center pt-12 sm:pt-20 w-[95%] max-w-2xl mx-auto px-2 sm:px-0 relative">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setShowSuggestions(false);
                  if (searchQuery.trim() !== "") {
                    router.push(
                      `/blogs?search=${encodeURIComponent(searchQuery.trim())}`
                    );
                  }
                }}
                className="flex w-full"
              >
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  className="flex-grow py-1 px-3 text-xs rounded-l-full outline-none text-black sm:py-3 sm:px-5 sm:text-base"
                  autoComplete="off"
                />
                {/* Suggestions dropdown */}
                {showSuggestions && searchSuggestions.length > 0 && (
                  <div className="absolute top-full mt-1 w-full bg-white rounded-lg shadow-lg  z-50 max-h-56 overflow-y-auto border border-gray-200">
                    {searchSuggestions.map((post) => (
                      <div
                        key={post._id}
                        onClick={() => {
                          router.push(`/blogs/${post._id}`);
                          setShowSuggestions(false);
                          setSearchQuery("");
                        }}
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-orange-50 transition-all border-b border-gray-100 last:border-b-0"
                      >
                        <img loading="lazy"
                          src={
                            post.images?.[0] ||
                            "https://placehold.co/48x48?text=B"
                          }
                          alt={post.title}
                          className="w-9 h-9 object-cover rounded-lg border border-gray-100 bg-gray-50 flex-shrink-0"
                         />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-start items-start text-gray-900 truncate">
                            {post.title}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {post.description.replace(/<[^>]+>/g, "")}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="submit"
                  className="bg-white p-1 sm:p-1.5 rounded-r-full flex items-center justify-center"
                >
                  <svg
                    width="36"
                    height="36"
                    viewBox="0 0 39 39"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-9 h-9"
                  >
                    <rect width="39" height="39" rx="19.5" fill="#FF8900" />
                    <path
                      d="M25.4778 23.7571H24.5718L24.2507 23.4475C25.4135 22.099 26.0525 20.3772 26.0512 18.5966C26.0512 17.1224 25.614 15.6812 24.7949 14.4554C23.9759 13.2296 22.8117 12.2742 21.4497 11.71C20.0876 11.1458 18.5889 10.9982 17.1429 11.2858C15.697 11.5734 14.3688 12.2834 13.3263 13.3258C12.2838 14.3683 11.5739 15.6965 11.2863 17.1424C10.9987 18.5884 11.1463 20.0871 11.7105 21.4492C12.2747 22.8112 13.2301 23.9754 14.4559 24.7945C15.6817 25.6135 17.1229 26.0507 18.5971 26.0507C20.4434 26.0507 22.1407 25.3741 23.448 24.2502L23.7576 24.5713V25.4773L29.4915 31.1997L31.2002 29.491L25.4778 23.7571ZM18.5971 23.7571C15.7416 23.7571 13.4366 21.4521 13.4366 18.5966C13.4366 15.7412 15.7416 13.4361 18.5971 13.4361C21.4526 13.4361 23.7576 15.7412 23.7576 18.5966C23.7576 21.4521 21.4526 23.7571 18.5971 23.7571Z"
                      fill="white"
                    />
                  </svg>
                </button>
              </form>
            </div>

            {/* Popular Searches */}
            <div className="hidden md:block mt-4 text-white text-sm">
              <span className="mr-2">Popular searches:</span>
              {topTags.map((tag, idx) => (
                <span
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className={`px-3 py-1 rounded-full border text-sm font-medium transition duration-300 cursor-pointer${idx !== 0 ? " ml-2" : ""
                    } ${selectedTag === tag
                      ? "bg-orange-500 text-white border-orange-500"
                      : "bg-white text-gray-700 border-gray-300 hover:border-orange-400 hover:text-orange-500"
                    }`}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Tab Filter Section */}
          <motion.div
            className=" "
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="overflow-x-auto md:p-4 p-2  md:px-6 px-4 whitespace-nowrap custom-scrollbar bg-[#FFF5F5]">
              <div className="inline-flex gap-1 sm:gap-2">
                <button
                  onClick={() => router.push("/blogs")}
                  className={`px-2 py-1 blog-tag-btn rounded-full border font-medium transition duration-300 sm:px-4 sm:py-2 ${selectedTag === "All"
                    ? "bg-orange-500 text-white"
                    : "bg-white text-gray-700  hover:border-orange-400 hover:text-orange-500"
                    }`}
                >
                  All
                </button>

                {uniqueTags.map((tag, index) => (
                  <button
                    key={index}
                    onClick={() => handleTagClick(tag)}
                    className={`px-2 py-1 blog-tag-btn rounded-full border font-medium transition duration-300 sm:px-4 sm:py-2 ${selectedTag === tag
                      ? "bg-orange-500 text-white"
                      : "bg-white text-gray-700  hover:border-orange-400 hover:text-orange-500"
                      }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Blog Posts */}
        <div className="blogpost  pt-[5vh] md:pt-[7vh] flex justify-center">
          <div className="container mx-auto px-2">
            <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4 px-1 sm:px-2 md:px-4 xl:px-8 justify-center justify-items-center">
              {filteredPosts.slice(0, visiblePosts).map((post, index) => (
                <BlogPostBox key={index} post={post} />
              ))}
            </div>
          </div>
        </div>

        {/* Show More Button */}
        {visiblePosts < filteredPosts.length && (
          <div className="flex  justify-center">
            <button
              onClick={handleShowMore}
              className="text-white bg-orange-500 hover:scale-110  py-2 px-6   rounded-full hover:bg-orange-600 transition-all duration-300"
            >
              Show More
            </button>
          </div>
        )}

        {/* Scroll to Top Button */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="fixed hidden bottom-10 right-10 bg-orange-500 text-white p-3 rounded-full shadow-lg hover:bg-orange-600 transition-all duration-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <path d="M12 19V6" />
              <path d="M5 13l7-7 7 7" />
            </svg>
          </button>
        )}
      </div>
    </>
  );
};

const BlogPostBox = ({ post }: { post: Blog }) => {
  const router = useRouter();

  return (
    <motion.div
      className="h-full "
      initial={{ opacity: 0, y: 100 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
    >
      <div
        onClick={() => router.push(`/blogs/${post._id}`)}
        className="bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition duration-300 cursor-pointer overflow-hidden flex flex-col h-full"
      >
        {/* Blog Image */}
        <div className="w-full h-24 sm:h-32 md:h-40 xl:h-44 2xl:h-52 flex-shrink-0">
          <img loading="lazy"
            src={post.images?.[0] || ""}
            alt={post.title}
            className="w-full h-full object-cover"
           />
        </div>

        {/* Blog Text Content */}
        <div className="p-2 sm:p-3 blog-card-xs flex flex-col flex-grow">
          <h2 className="font-semibold text-sm text-gray-900 line-clamp-2 min-h-[2.5rem]">
            {post.title}
          </h2>
          <p className="text-xs text-gray-600 mt-1 line-clamp-2 ">
            {post.description.replace(/<[^>]+>/g, "")}
          </p>

          {/* Footer with Author and Date */}
          <div className="flex items-center justify-between text-[10px] sm:text-xs text-gray-500 mt-2 border-t pt-1 flex-shrink-0">
            <div className="flex items-center gap-1">
              <Person style={{ fontSize: "14px" }} />
              <span className="truncate max-w-[50px] sm:max-w-none">{post.author}</span>
            </div>
            <div className="flex items-center gap-1">
              <CalendarMonthOutlined style={{ fontSize: "14px" }} />
              <span>{new Date(post.addedOn).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};


export default Blogpage;
